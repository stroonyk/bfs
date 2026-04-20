// Programme page functionality

// Season configurations
const SEASONS = {
  "2026-2027": {
    sheetId: "1fSd1buNLplD0cQckUExRV4ODb-uk144iLuZq8tae8vc",
    reactionsSheetId: "1gGzlsbLcCreHIi4SJEtFI1dulLZ5ZbphNiV5bWVZ-1c",
    imageFolder: "2627",
  },
  "2025-2026": {
    sheetId: "1VwKUYCRjdFuKsbI5qXw3ulOCmlJBe2nGIyyoa36sTpo",
    reactionsSheetId: "1zgoxxY_lh7jzNhsrQJPGLTUMBmC9eULAizFpSXzWSoU",
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
let allFilms = []; // Store all films for sorting

// Get season from URL parameter or default to current
function getInitialSeason() {
  const urlParams = new URLSearchParams(window.location.search);
  const seasonParam = urlParams.get("season");
  return seasonParam && SEASONS[seasonParam] ? seasonParam : "2025-2026";
}

// Fetch reactions data to get overall scores
async function fetchReactionsScores(season) {
  const seasonConfig = SEASONS[season];
  if (!seasonConfig.reactionsSheetId) return {};

  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${seasonConfig.reactionsSheetId}/gviz/tq?tqx=out=json&headers=1`);
    const text = await response.text();
    const json = JSON.parse(text.substr(47).slice(0, -2));

    const scoresMap = {};
    json.table.rows.forEach(row => {
      const cells = row.c;
      if (cells && cells[1]) {
        const title = cells[1].v;
        const excellent = parseInt(cells[4]?.v) || 0;
        const good = parseInt(cells[5]?.v) || 0;
        const fair = parseInt(cells[6]?.v) || 0;
        const poor = parseInt(cells[7]?.v) || 0;
        const awful = parseInt(cells[8]?.v) || 0;

        const total = excellent + good + fair + poor + awful;
        if (total > 0) {
          const weightedScore = (excellent * 1) + (good * 0.75) + (fair * 0.5) + (poor * 0.25);
          const overallRating = Math.round((weightedScore / total) * 100);
          scoresMap[title] = overallRating;
        }
      }
    });
    return scoresMap;
  } catch (error) {
    console.error('Error fetching reactions scores:', error);
    return {};
  }
}

// Fetch and display films
async function loadFilms(season) {
  if (isLoading) return;
  isLoading = true;

  currentSeason = season || currentSeason;
  const seasonConfig = SEASONS[currentSeason];
  const SHEET_URL = `https://docs.google.com/spreadsheets/d/${seasonConfig.sheetId}/gviz/tq?tqx=out:json&headers=1`;

  try {
    // Fetch both programme and reactions data
    const [programmeResponse, reactionsScores] = await Promise.all([
      fetch(SHEET_URL),
      fetchReactionsScores(currentSeason)
    ]);

    const text = await programmeResponse.text();

    // Parse the JSON response (Google returns JSONP, need to extract JSON)
    const json = JSON.parse(text.substr(47).slice(0, -2));
    const rows = json.table.rows;

    // Hide loading
    document.getElementById("loading").style.display = "none";

    // Get film grid container
    const filmGrid = document.getElementById("film-grid");
    filmGrid.innerHTML = "";

    // Reset allFilms array
    allFilms = [];

    // Process each row (don't skip - the API already handles headers)
    rows.forEach((row) => {
      const cells = row.c;

      // Skip if no data
      if (!cells || !cells[1] || !cells[1].v) return;

      const title = cells[1]?.v || "";
      const film = {
        date: cells[0]?.v || "",
        title: title,
        genre: cells[2]?.v || "",
        note: cells[3]?.v || "",
        description: cells[4]?.v || "",
        info: cells[5]?.v || "",
        image: cells[6]?.v || "placeholder.jpg",
        trailer: cells[7]?.v || "",
        rottenTomatoes: cells[8]?.v || "",
        rtScore: cells[9]?.v || "",
        imdbLink: cells[10]?.v || "",
        imdbScore: cells[11]?.v || "",
        overallScore: reactionsScores[title] || null,
      };

      allFilms.push(film);
    });

    // Display films
    displayFilms(allFilms);

    // Show sort dropdown
    document.getElementById("sort-container").style.display = "flex";
  } catch (error) {
    console.error("Error loading films:", error);
    document.getElementById("loading").style.display = "none";
    document.getElementById("error").style.display = "block";
  } finally {
    isLoading = false;
  }
}

// Display films in the grid
function displayFilms(films) {
  const filmGrid = document.getElementById("film-grid");
  filmGrid.innerHTML = "";

  films.forEach((film) => {
    const card = createFilmCard(film);
    filmGrid.appendChild(card);
  });
}

// Sort films
function sortFilms(sortBy) {
  let sortedFilms = [...allFilms];

  if (sortBy === "score") {
    // Sort by overall score (highest first), films without scores go to the end
    sortedFilms.sort((a, b) => {
      if (a.overallScore === null && b.overallScore === null) return 0;
      if (a.overallScore === null) return 1;
      if (b.overallScore === null) return -1;
      return b.overallScore - a.overallScore;
    });
  }
  // Default is date order (original order from spreadsheet)

  displayFilms(sortedFilms);
}

// Create a film card element
function createFilmCard(film) {
  const card = document.createElement("div");
  card.className = "film-card";

  // Add ID for scroll anchor
  const filmSlug = film.title.replace(/\s+/g, '-').toLowerCase();
  card.id = filmSlug;

  const seasonConfig = SEASONS[currentSeason];

  card.innerHTML = `
        <div class="film-poster">
            <img src="assets/images/${seasonConfig.imageFolder}/${film.image}" alt="${film.title}" onerror="this.onerror=null; this.style.display='none';">
        </div>
        <div class="film-content">
            <h3 class="film-title">${film.title}</h3>
            <div class="film-date-genre">
                <p class="film-date">${film.date}</p>
                <div class="film-genre">${film.genre}</div>
            </div>
            <div class="film-badges">
                <div class="badges-left">
                    ${
                      film.rottenTomatoes
                        ? `<a href="${film.rottenTomatoes}" target="_blank" rel="noopener noreferrer" class="rt-score ${film.rtScore && parseInt(film.rtScore) < 60 ? "rotten" : "fresh"}">${film.rtScore ? (parseInt(film.rtScore) < 60 ? "🤢" : "🍅") + " " + film.rtScore + "%" : "🍅"}</a>`
                        : film.rtScore
                          ? `<div class="rt-score ${parseInt(film.rtScore) < 60 ? "rotten" : "fresh"}">${parseInt(film.rtScore) < 60 ? "🤢" : "🍅"} ${film.rtScore}%</div>`
                          : ""
                    }
                    ${
                      film.imdbScore && film.imdbLink
                        ? `<a href="${film.imdbLink}" target="_blank" rel="noopener noreferrer" class="imdb-score">⭐ ${film.imdbScore}</a>`
                        : film.imdbScore
                          ? `<div class="imdb-score">⭐ ${film.imdbScore}</div>`
                          : ""
                    }
                </div>
                ${
                  film.overallScore
                    ? `<a href="reactions.html?season=${currentSeason}#${encodeURIComponent(film.title.replace(/\s+/g, '-').toLowerCase())}" class="bfs-score"><img src="assets/images/spool_logo.gif" alt="BFS" class="bfs-icon"> ${film.overallScore}%</a>`
                    : ""
                }
            </div>
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
    document.getElementById("sort-container").style.display = "none";
    loadFilms(newSeason);
  });

  // Handle sort change
  const sortSelect = document.getElementById("sort-select");
  sortSelect.addEventListener("change", (e) => {
    sortFilms(e.target.value);
  });

  // Handle hash navigation (scroll to film)
  window.addEventListener('hashchange', scrollToFilm);
  if (window.location.hash) {
    setTimeout(scrollToFilm, 500);
  }
});

// Scroll to film based on hash
function scrollToFilm() {
  if (window.location.hash) {
    const filmId = decodeURIComponent(window.location.hash.substring(1));
    const filmElement = document.getElementById(filmId);
    if (filmElement) {
      filmElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight briefly
      filmElement.style.outline = '3px solid #FFD700';
      setTimeout(() => {
        filmElement.style.outline = '';
      }, 2000);
    }
  }
}
