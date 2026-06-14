const playlistUrls = [
  "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/br.m3u",
  "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/us_pluto.m3u",
  "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/br_pluto.m3u",
  "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/us_xumo.m3u",
"https://iptv-org.github.io/iptv/countries/br.m3u",
  "https://iptv-org.github.io/iptv/categories/sports.m3u",
  "https://iptv-org.github.io/iptv/categories/news.m3u",
  "https://iptv-org.github.io/iptv/categories/music.m3u",
  "https://iptv-org.github.io/iptv/categories/kids.m3u",
  "https://iptv-org.github.io/iptv/categories/entertainment.m3u"
];

const video = document.getElementById("video");
const channelName = document.getElementById("channel-name");
const channelDesc = document.getElementById("channel-desc");
const categoriesContainer = document.getElementById("categories");
const searchInput = document.getElementById("search");
const favoriteBtn = document.getElementById("favoriteBtn");

let channels = [];
let currentChannel = null;
let hls;

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let watched = JSON.parse(localStorage.getItem("watched")) || {};

async function loadPlaylist() {
  let allChannels = [];

  for (const url of playlistUrls) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.log("Playlist não encontrada:", url);
        continue;
      }

      const text = await response.text();
      allChannels = allChannels.concat(parseM3U(text));
    } catch (error) {
      console.log("Erro ao carregar:", url, error);
    }
  }

  channels = removeDuplicates(allChannels);

  if (channels.length === 0) {
    categoriesContainer.innerHTML = "<p class='loading'>Nenhum canal carregado.</p>";
    return;
  }

  renderHome();
}

function parseM3U(data) {
  const lines = data.split("\n");
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("#EXTINF")) {
      const name = line.split(",").pop()?.trim();
      const logoMatch = line.match(/tvg-logo="(.*?)"/);
      const groupMatch = line.match(/group-title="(.*?)"/);
      const countryMatch = line.match(/tvg-country="(.*?)"/);
      const idMatch = line.match(/tvg-id="(.*?)"/);

      const streamUrl = lines[i + 1]?.trim();

      if (streamUrl && streamUrl.startsWith("http")) {
        result.push({
          id: idMatch ? idMatch[1] : streamUrl,
          name: name || "Canal sem nome",
          logo: logoMatch ? logoMatch[1] : "",
          group: groupMatch ? groupMatch[1] : "Outros",
          country: countryMatch ? countryMatch[1] : "Global",
          url: streamUrl
        });
      }
    }
  }

  return result;
}

function removeDuplicates(list) {
  const seen = new Set();

  return list.filter(channel => {
    if (seen.has(channel.url)) return false;
    seen.add(channel.url);
    return true;
  });
}

function renderHome() {
  categoriesContainer.innerHTML = "";

  const favoriteChannels = channels.filter(c => favorites.includes(c.url));
  const mostWatched = getMostWatched();

  if (favoriteChannels.length > 0) {
    createCategory("⭐ Favoritos", favoriteChannels);
  }

  if (mostWatched.length > 0) {
    createCategory("🔥 Mais acessados", mostWatched);
  }

  createCategory("🇧🇷 Brasil", channels.filter(c => c.country.includes("BR") || c.url.includes("/br")));
  createCategory("⚽ Esportes", filterByGroup("sports"));
  createCategory("📰 Notícias", filterByGroup("news"));
  createCategory("🎵 Música", filterByGroup("music"));
  createCategory("🧒 Infantil", filterByGroup("kids"));
  createCategory("🎬 Entretenimento", filterByGroup("entertainment"));
  createCategory("📺 Todos os canais", channels);
}

function createCategory(title, list) {
  if (!list || list.length === 0) return;

  const section = document.createElement("section");
  section.className = "category";

  section.innerHTML = `<h2>${title}</h2>`;

  const row = document.createElement("div");
  row.className = "row";

  list.slice(0, 120).forEach(channel => {
    row.appendChild(createCard(channel));
  });

  section.appendChild(row);
  categoriesContainer.appendChild(section);
}

function createCard(channel) {
  const card = document.createElement("div");
  card.className = "card";

  const isFavorite = favorites.includes(channel.url);

  card.innerHTML = `
    ${isFavorite ? "<div class='star'>⭐</div>" : ""}
    <div class="logo-box">
      ${
        channel.logo
          ? `<img src="${channel.logo}" alt="${channel.name}" onerror="this.style.display='none'">`
          : `<div class="no-logo">TV</div>`
      }
    </div>
    <strong>${channel.name}</strong>
    <span>${translateCategory(channel.group)} • ${channel.country}</span>
  `;

  card.onclick = () => playChannel(channel);

  return card;
}

function playChannel(channel) {
  currentChannel = channel;

  channelName.textContent = channel.name;
  channelDesc.textContent = `${translateCategory(channel.group)} • ${channel.country}`;

  updateFavoriteButton();
  addWatched(channel);
  updateBanner(channel);

  if (hls) {
    hls.destroy();
  }

  video.pause();
  video.removeAttribute("src");
  video.load();

  if (Hls.isSupported()) {
    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true
    });

    hls.loadSource(channel.url);
    hls.attachMedia(video);

    hls.on(Hls.Events.ERROR, function (event, data) {
      console.log("Erro HLS:", data);
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = channel.url;
  } else {
    alert("Seu navegador não suporta esse canal.");
  }
}

function updateBanner(channel) {
  const banner = document.querySelector(".banner");

  if (!banner) return;

  if (channel.logo) {
    banner.style.background = `
      linear-gradient(to top, #090909 5%, rgba(9,9,9,0.75) 60%),
      linear-gradient(to right, #090909 20%, rgba(9,9,9,0.45) 100%),
      url("${channel.logo}") center right / contain no-repeat
    `;
  }
}

function updateFavoriteButton() {
  if (!currentChannel) return;

  const isFavorite = favorites.includes(currentChannel.url);
  favoriteBtn.textContent = isFavorite ? "✅ Favorito" : "⭐ Favoritar";
}

favoriteBtn.addEventListener("click", () => {
  if (!currentChannel) return;

  if (favorites.includes(currentChannel.url)) {
    favorites = favorites.filter(url => url !== currentChannel.url);
  } else {
    favorites.push(currentChannel.url);
  }

  localStorage.setItem("favorites", JSON.stringify(favorites));
  updateFavoriteButton();
  renderHome();
});

function addWatched(channel) {
  watched[channel.url] = (watched[channel.url] || 0) + 1;
  localStorage.setItem("watched", JSON.stringify(watched));
}

function getMostWatched() {
  return channels
    .filter(channel => watched[channel.url])
    .sort((a, b) => watched[b.url] - watched[a.url])
    .slice(0, 40);
}

function showFavorites() {
  const favoriteChannels = channels.filter(channel =>
    favorites.includes(channel.url)
  );

  categoriesContainer.innerHTML = "";

  if (favoriteChannels.length === 0) {
    categoriesContainer.innerHTML = "<p class='loading'>Nenhum favorito ainda.</p>";
    return;
  }

  createCategory("⭐ Favoritos", favoriteChannels);
}

function showMostWatched() {
  const mostWatched = getMostWatched();

  categoriesContainer.innerHTML = "";

  if (mostWatched.length === 0) {
    categoriesContainer.innerHTML = "<p class='loading'>Nenhum canal assistido ainda.</p>";
    return;
  }

  createCategory("🔥 Mais acessados", mostWatched);
}

function filterCategory(category) {
  if (category === "all") {
    renderHome();
    return;
  }

  const filtered = filterByGroup(category);

  categoriesContainer.innerHTML = "";

  if (filtered.length === 0) {
    categoriesContainer.innerHTML = "<p class='loading'>Nenhum canal nessa categoria.</p>";
    return;
  }

  createCategory(translateCategory(category), filtered);
}

function filterByGroup(group) {
  return channels.filter(channel =>
    channel.group.toLowerCase().includes(group.toLowerCase())
  );
}

function translateCategory(category) {
  const map = {
    "Sports": "⚽ Esportes",
    "sports": "⚽ Esportes",
    "News": "📰 Notícias",
    "news": "📰 Notícias",
    "Music": "🎵 Música",
    "music": "🎵 Música",
    "Kids": "🧒 Infantil",
    "kids": "🧒 Infantil",
    "Entertainment": "🎬 Entretenimento",
    "entertainment": "🎬 Entretenimento",
    "Movies": "🎥 Filmes",
    "General": "📺 Geral",
    "Undefined": "📦 Outros",
    "Outros": "📦 Outros"
  };

  return map[category] || category || "📦 Outros";
}

searchInput.addEventListener("input", () => {
  const search = searchInput.value.toLowerCase().trim();

  if (!search) {
    renderHome();
    return;
  }

  const filtered = channels.filter(channel =>
    channel.name.toLowerCase().includes(search) ||
    channel.group.toLowerCase().includes(search) ||
    channel.country.toLowerCase().includes(search)
  );

  categoriesContainer.innerHTML = "";

  if (filtered.length === 0) {
    categoriesContainer.innerHTML = "<p class='loading'>Nenhum canal encontrado.</p>";
    return;
  }

  createCategory(`Resultado para "${search}"`, filtered);
});

loadPlaylist();