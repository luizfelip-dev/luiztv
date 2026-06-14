const playlistUrls = [
"https://github.com/iptv-org/iptv/blob/master/streams/us_pluto.m3u",
"https://github.com/iptv-org/iptv/blob/master/streams/br_pluto.m3u",
"https://github.com/iptv-org/iptv/blob/master/streams/br.m3u",
"https://github.com/iptv-org/iptv/blob/master/streams/us_xumo.m3u"
];

const video = document.getElementById("video");
const channelName = document.getElementById("channel-name");
const categoriesContainer = document.getElementById("categories");
const searchInput = document.getElementById("search");

let channels = [];
let hls;

async function loadPlaylist() {
  try {
    let allChannels = [];

    for (const url of playlistUrls) {
      const response = await fetch(url);
      const text = await response.text();
      allChannels = allChannels.concat(parseM3U(text));
    }

    channels = removeDuplicates(allChannels);
    renderCategories(channels);
  } catch (error) {
    categoriesContainer.innerHTML = "<p class='loading'>Erro ao carregar canais.</p>";
    console.error(error);
  }
}

function removeDuplicates(list) {
  const seen = new Set();

  return list.filter(channel => {
    if (seen.has(channel.url)) return false;
    seen.add(channel.url);
    return true;
  });
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

      const url = lines[i + 1]?.trim();

      if (url && url.startsWith("http")) {
        result.push({
          name: name || "Canal sem nome",
          logo: logoMatch ? logoMatch[1] : "",
          group: groupMatch ? groupMatch[1] : "Outros",
          country: countryMatch ? countryMatch[1] : "Global",
          url: url
        });
      }
    }
  }

  return result;
}

function renderCategories(list) {
  categoriesContainer.innerHTML = "";

  const grouped = {};

  list.forEach(channel => {
    const category = channel.group || "Outros";

    if (!grouped[category]) {
      grouped[category] = [];
    }

    grouped[category].push(channel);
  });

  const categoryNames = Object.keys(grouped).sort();

  categoryNames.forEach(category => {
    const section = document.createElement("section");
    section.className = "category";

    const title = document.createElement("h2");
    title.textContent = category;

    const row = document.createElement("div");
    row.className = "row";

    grouped[category].slice(0, 80).forEach(channel => {
      row.appendChild(createCard(channel));
    });

    section.appendChild(title);
    section.appendChild(row);
    categoriesContainer.appendChild(section);
  });
}

function createCard(channel) {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    ${channel.logo ? `<img src="${channel.logo}" alt="${channel.name}">` : ""}
    <strong>${channel.name}</strong>
    <span>${channel.country}</span>
  `;

  card.onclick = () => playChannel(channel);

  return card;
}

function playChannel(channel) {
  channelName.textContent = channel.name;

  if (hls) {
    hls.destroy();
  }

  if (Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(channel.url);
    hls.attachMedia(video);
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = channel.url;
  } else {
    alert("Seu navegador não suporta esse tipo de transmissão.");
  }
}

searchInput.addEventListener("input", () => {
  const search = searchInput.value.toLowerCase();

  if (search.trim() === "") {
    renderCategories(channels);
    return;
  }

  const filtered = channels.filter(channel =>
    channel.name.toLowerCase().includes(search) ||
    channel.group.toLowerCase().includes(search) ||
    channel.country.toLowerCase().includes(search)
  );

  renderCategories(filtered);
});

loadPlaylist();