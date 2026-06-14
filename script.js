const playlistUrls = [
  "https://iptv-org.github.io/iptv/countries/br.m3u",
  "https://iptv-org.github.io/iptv/categories/news.m3u",
  "https://iptv-org.github.io/iptv/categories/sports.m3u",
  "https://iptv-org.github.io/iptv/categories/movies.m3u",
  "https://iptv-org.github.io/iptv/categories/entertainment.m3u"
];


const video = document.getElementById("video");
const channelName = document.getElementById("channel-name");
const channelsList = document.getElementById("channels-list");
const searchInput = document.getElementById("search");

let channels = [];

async function loadPlaylist() {
  try {
    const response = await fetch(playlistUrl);
    const text = await response.text();

    channels = parseM3U(text);
    showChannels(channels);
  } catch (error) {
    channelsList.innerHTML = "<p>Erro ao carregar canais.</p>";
    console.error(error);
  }
}

function parseM3U(data) {
  const lines = data.split("\n");
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("#EXTINF")) {
      const name = line.split(",").pop();
      const logoMatch = line.match(/tvg-logo="(.*?)"/);
      const groupMatch = line.match(/group-title="(.*?)"/);

      const url = lines[i + 1]?.trim();

      if (url && url.startsWith("http")) {
        result.push({
          name: name || "Canal sem nome",
          logo: logoMatch ? logoMatch[1] : "",
          group: groupMatch ? groupMatch[1] : "Sem categoria",
          url: url
        });
      }
    }
  }

  return result;
}

function showChannels(list) {
  channelsList.innerHTML = "";

  if (list.length === 0) {
    channelsList.innerHTML = "<p>Nenhum canal encontrado.</p>";
    return;
  }

  list.forEach(channel => {
    const div = document.createElement("div");
    div.className = "channel";

    div.innerHTML = `
      <strong>${channel.name}</strong>
      <span>${channel.group}</span>
    `;

    div.onclick = () => playChannel(channel);

    channelsList.appendChild(div);
  });
}

function playChannel(channel) {
  channelName.textContent = channel.name;

  if (Hls.isSupported()) {
    const hls = new Hls();
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

  const filtered = channels.filter(channel =>
    channel.name.toLowerCase().includes(search) ||
    channel.group.toLowerCase().includes(search)
  );

  showChannels(filtered);
});

loadPlaylist();
