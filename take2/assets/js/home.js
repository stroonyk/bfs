// Home page - fetch next film and display trailer

const CURRENT_SEASON = "2025-2026";
const SHEET_ID = "1VwKUYCRjdFuKsbI5qXw3ulOCmlJBe2nGIyyoa36sTpo";
const IMAGE_FOLDER = "2526";

async function loadNextFilm() {
  const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1`;

  try {
    const response = await fetch(SHEET_URL);
    const text = await response.text();
    const json = JSON.parse(text.substr(47).slice(0, -2));
    const rows = json.table.rows;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filmsWithDates = [];

    // Parse all films with dates and trailers
    for (const row of rows) {
      const cells = row.c;
      if (!cells || !cells[1] || !cells[1].v) continue;

      // Get the date cell - check both v (value) and f (formatted)
      const dateCell = cells[0];
      const dateStr = dateCell?.f || dateCell?.v || "";

      console.log("Date cell:", dateCell, "dateStr:", dateStr);

      const film = {
        date: dateStr,
        title: cells[1]?.v || "",
        genre: cells[2]?.v || "",
        note: cells[3]?.v || "",
        description: cells[4]?.v || "",
        info: cells[5]?.v || "",
        image: cells[6]?.v || "",
        trailer: cells[7]?.v || "",
        rottenTomatoes: cells[8]?.v || "",
        rtScore: cells[9]?.v || "",
        imdbLink: cells[10]?.v || "",
        imdbScore: cells[11]?.v || "",
      };

      // Only consider films with trailers
      if (!film.trailer) continue;
      if (!dateStr) continue;

      // Parse date - try multiple formats
      let filmDate = null;

      // Check if it's a Google Sheets date number (days since Dec 30, 1899)
      if (dateCell?.v && typeof dateCell.v === 'number') {
        // Google Sheets date number to JavaScript Date
        filmDate = new Date((dateCell.v - 25569) * 86400 * 1000);
        filmDate.setHours(0, 0, 0, 0);
      } else {
        // Parse formats with month names
        const monthNames = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };

        // Match pattern like "Fri 15 May 2026"
        const singleDayMatch = dateStr.match(/\w+\s+(\d+)\s+(\w+)\s+(\d{4})/);
        if (singleDayMatch) {
          const day = parseInt(singleDayMatch[1]);
          const monthStr = singleDayMatch[2].toLowerCase().substring(0, 3);
          const year = parseInt(singleDayMatch[3]);
          const month = monthNames[monthStr];

          if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            filmDate = new Date(year, month, day);
            filmDate.setHours(0, 0, 0, 0);
          }
        }
        // Match pattern like "Mon 20/Tue 21 Apr 2026"
        else {
          const complexMatch = dateStr.match(/\w+\s+(\d+)\/\w+\s+\d+\s+(\w+)\s+(\d{4})/);
          if (complexMatch) {
            const day = parseInt(complexMatch[1]);
            const monthStr = complexMatch[2].toLowerCase().substring(0, 3);
            const year = parseInt(complexMatch[3]);
            const month = monthNames[monthStr];

            if (!isNaN(day) && month !== undefined && !isNaN(year)) {
              filmDate = new Date(year, month, day);
              filmDate.setHours(0, 0, 0, 0);
            }
          } else {
            // Try parsing "DD/MM/YYYY" or "D/M/YYYY" string format
            const dateParts = dateStr.split(/[\/\-\s,]+/).filter(p => p);
            if (dateParts.length >= 3) {
              const day = parseInt(dateParts[0]);
              const month = parseInt(dateParts[1]) - 1;
              const year = parseInt(dateParts[2]);
              if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                filmDate = new Date(year, month, day);
                filmDate.setHours(0, 0, 0, 0);
              }
            }
          }
        }
      }

      if (filmDate && !isNaN(filmDate.getTime())) {
        filmsWithDates.push({
          film: film,
          date: filmDate,
          daysFromToday: Math.abs(filmDate - today) / (1000 * 60 * 60 * 24)
        });
      }
    }

    // Filter to only upcoming films (including today)
    const upcomingFilms = filmsWithDates.filter(f => f.date >= today);

    let nextFilm = null;

    if (upcomingFilms.length > 0) {
      // Sort upcoming films by date (earliest first)
      upcomingFilms.sort((a, b) => a.date - b.date);
      nextFilm = upcomingFilms[0].film;
      console.log("Next upcoming film:", nextFilm.title, "on", upcomingFilms[0].date);
    } else if (filmsWithDates.length > 0) {
      // No upcoming films, show most recent past film
      filmsWithDates.sort((a, b) => b.date - a.date);
      nextFilm = filmsWithDates[0].film;
      console.log("No upcoming films, showing most recent:", nextFilm.title);
    }

    // Display next film if found
    if (nextFilm) {
      const titleElement = document.getElementById("next-film-name");
      titleElement.textContent = nextFilm.title;

      // Make title clickable - link to programme page with anchor
      titleElement.style.cursor = "pointer";
      titleElement.style.textDecoration = "underline";
      titleElement.addEventListener("click", () => {
        const filmSlug = nextFilm.title.replace(/\s+/g, '-').toLowerCase();
        window.location.href = `programme.html?season=${CURRENT_SEASON}#${encodeURIComponent(filmSlug)}`;
      });

      // Add RT and IMDB badges
      let badgesHtml = '';
      if (nextFilm.rottenTomatoes) {
        badgesHtml += `<a href="${nextFilm.rottenTomatoes}" target="_blank" rel="noopener noreferrer" class="rt-score ${nextFilm.rtScore && parseInt(nextFilm.rtScore) < 60 ? "rotten" : "fresh"}">${nextFilm.rtScore ? (parseInt(nextFilm.rtScore) < 60 ? "🤢" : "🍅") + " " + nextFilm.rtScore + "%" : "🍅"}</a>`;
      } else if (nextFilm.rtScore) {
        badgesHtml += `<div class="rt-score ${parseInt(nextFilm.rtScore) < 60 ? "rotten" : "fresh"}">${parseInt(nextFilm.rtScore) < 60 ? "🤢" : "🍅"} ${nextFilm.rtScore}%</div>`;
      }

      if (nextFilm.imdbScore && nextFilm.imdbLink) {
        badgesHtml += `<a href="${nextFilm.imdbLink}" target="_blank" rel="noopener noreferrer" class="imdb-score">⭐ ${nextFilm.imdbScore}</a>`;
      } else if (nextFilm.imdbScore) {
        badgesHtml += `<div class="imdb-score">⭐ ${nextFilm.imdbScore}</div>`;
      }

      const badgesContainer = document.getElementById("next-film-badges");
      if (badgesContainer && badgesHtml) {
        badgesContainer.innerHTML = badgesHtml;
      }

      document.getElementById("next-film-date").textContent = nextFilm.date;
      document.getElementById("next-film-description").textContent = nextFilm.description;
      document.getElementById("next-film-iframe").src = `https://www.youtube.com/embed/${nextFilm.trailer}`;
      document.querySelector(".next-film-section").style.display = "block";
    } else {
      console.log("No film with trailer found");
    }
  } catch (error) {
    console.error("Error loading next film:", error);
  }
}

// Load on page load
document.addEventListener("DOMContentLoaded", loadNextFilm);
