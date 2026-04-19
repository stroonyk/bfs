// Programme page functionality

// Season configurations
const SEASONS = {
  "2026-2027": {
    sheetId: "1fSd1buNLplD0cQckUExRV4ODb-uk144iLuZq8tae8vc",
    imageFolder: "2627",
  },
  "2025-2026": {
    sheetId: "1VwKUYCRjdFuKsbI5qXw3ulOCmlJBe2nGIyyoa36sTpo",
    imageFolder: "2526",
  },
  "2024-2025": {
    sheetId: "1VJVMMnPgKs6m5kBYegmKJu1d3yxtJ-xj3aNpzXhFvs0",
    imageFolder: "2425",
  },
  "2023-2024": {
    sheetId: "18AJTo4FOEAjtUuW15FLmUG0b5mTBeqKvgnXnmQPV-A0",
    imageFolder: "2324",
  },
};

let currentSeason = "2025-2026";
let isLoading = false;

// Get season from URL parameter or default to current
function getInitialSeason() {
  const urlParams = new URLSearchParams(window.location.search);
  const seasonParam = urlParams.get("season");
  return seasonParam && SEASONS[seasonParam] ? seasonParam : "2025-2026";
}

// Fetch and display films
async function loadFilms(season) {
  if (isLoading) return;
  isLoading = true;

  currentSeason = season || currentSeason;
  const seasonConfig = SEASONS[currentSeason];
  const SHEET_URL = `https://docs.google.com/spreadsheets/d/${seasonConfig.sheetId}/gviz/tq?tqx=out:json&headers=1`;

  try {
    const response = await fetch(SHEET_URL);
    const text = await response.text();

    // Parse the JSON response (Google returns JSONP, need to extract JSON)
    const json = JSON.parse(text.substr(47).slice(0, -2));
    const rows = json.table.rows;

    // Hide loading
    document.getElementById("loading").style.display = "none";

    // Get film grid container
    const filmGrid = document.getElementById("film-grid");
    filmGrid.innerHTML = "";

    // Process each row (don't skip - the API already handles headers)
    rows.forEach((row) => {
      const cells = row.c;

      // Skip if no data
      if (!cells || !cells[1] || !cells[1].v) return;

      const film = {
        date: cells[0]?.v || "",
        title: cells[1]?.v || "",
        genre: cells[2]?.v || "",
        note: cells[3]?.v || "",
        description: cells[4]?.v || "",
        info: cells[5]?.v || "",
        image: cells[6]?.v || "placeholder.jpg",
        trailer: cells[7]?.v || "",
        rottenTomatoes: cells[8]?.v || "",
        rtScore: cells[9]?.v || "",
      };

      // Create film card
      const card = createFilmCard(film);
      filmGrid.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading films:", error);
    document.getElementById("loading").style.display = "none";
    document.getElementById("error").style.display = "block";
  } finally {
    isLoading = false;
  }
}

// Create a film card element
function createFilmCard(film) {
  const card = document.createElement("div");
  card.className = "film-card";

  const seasonConfig = SEASONS[currentSeason];

  card.innerHTML = `
        <div class="film-poster">
            <img src="assets/images/${seasonConfig.imageFolder}/${film.image}" alt="${film.title}" onerror="this.onerror=null; this.style.display='none';">
        </div>
        <div class="film-content">
            <p class="film-date">${film.date}</p>
            <div class="film-badges">
                <div class="film-genre">${film.genre}</div>
                ${
                  film.rtScore && film.rottenTomatoes
                    ? `<a href="${film.rottenTomatoes}" target="_blank" rel="noopener noreferrer" class="rt-score ${parseInt(film.rtScore) < 60 ? "rotten" : "fresh"}">${parseInt(film.rtScore) < 60 ? "🤢" : "🍅"} ${film.rtScore}%</a>`
                    : film.rtScore
                      ? `<div class="rt-score ${parseInt(film.rtScore) < 60 ? "rotten" : "fresh"}">${parseInt(film.rtScore) < 60 ? "🤢" : "🍅"} ${film.rtScore}%</div>`
                      : ""
                }
            </div>
            <h3 class="film-title">${film.title}</h3>
            ${film.note ? `<p class="film-note">${film.note}</p>` : ""}
            <p class="film-description">${film.description}</p>
            <p class="film-info">${film.info}</p>
            <div class="film-actions">
                ${film.trailer ? `<button class="trailer-btn" data-trailer="${film.trailer}" data-title="${film.title}">▶ Watch Trailer</button>` : ""}
            </div>
        </div>
    `;

  // Add trailer button click handler
  if (film.trailer) {
    const trailerBtn = card.querySelector(".trailer-btn");
    trailerBtn.addEventListener("click", () =>
      openTrailerModal(film.trailer, film.title),
    );
  }

  return card;
}

// Trailer Modal Functions
function openTrailerModal(trailerId, title) {
  const modal = document.getElementById("trailer-modal");
  const iframe = document.getElementById("trailer-iframe");
  const modalTitle = document.getElementById("modal-title");

  modalTitle.textContent = title;
  iframe.src = `https://www.youtube.com/embed/${trailerId}?autoplay=1`;
  modal.style.display = "flex";
}

function closeTrailerModal() {
  const modal = document.getElementById("trailer-modal");
  const iframe = document.getElementById("trailer-iframe");

  iframe.src = "";
  modal.style.display = "none";
}

// Close modal when clicking outside
window.addEventListener("click", (e) => {
  const modal = document.getElementById("trailer-modal");
  if (e.target === modal) {
    closeTrailerModal();
  }
});

// Season selector change handler
document.addEventListener("DOMContentLoaded", () => {
  const seasonSelect = document.getElementById("season-select");

  // Populate dropdown from SEASONS config
  Object.keys(SEASONS).forEach((seasonKey) => {
    const option = document.createElement("option");
    option.value = seasonKey;
    option.textContent = seasonKey.replace("-", "/");
    seasonSelect.appendChild(option);
  });

  // Set initial season
  currentSeason = getInitialSeason();
  seasonSelect.value = currentSeason;

  // Load films for initial season
  loadFilms(currentSeason);

  // Handle season change
  seasonSelect.addEventListener("change", (e) => {
    const newSeason = e.target.value;

    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set("season", newSeason);
    window.history.pushState({}, "", url);

    // Clear grid and reload
    document.getElementById("film-grid").innerHTML = "";
    document.getElementById("loading").style.display = "block";
    loadFilms(newSeason);
  });
});
