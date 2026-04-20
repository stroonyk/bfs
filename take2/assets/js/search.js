// Search functionality across all seasons

const SEASONS_SEARCH = {
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

// Open search modal
document.getElementById('search-icon').addEventListener('click', () => {
    document.getElementById('search-modal').style.display = 'flex';
    document.getElementById('search-input').focus();
});

// Close search modal
document.getElementById('search-close').addEventListener('click', () => {
    document.getElementById('search-modal').style.display = 'none';
    document.getElementById('search-input').value = '';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('search-modal');
    if (e.target === modal) {
        modal.style.display = 'none';
        document.getElementById('search-input').value = '';
    }
});

// Fetch reactions scores for a season
async function fetchReactionsScoresForSearch(season) {
    const seasonConfig = SEASONS_SEARCH[season];
    if (!seasonConfig.reactionsSheetId) return {};

    try {
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${seasonConfig.reactionsSheetId}/gviz/tq?tqx=out:json&headers=1`);
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

// Search all seasons - redirect to search results page
function searchFilms(query) {
    if (!query || query.trim().length < 2) {
        alert('Please enter at least 2 characters to search');
        return;
    }

    // Close modal and redirect to search results page
    document.getElementById('search-modal').style.display = 'none';
    window.location.href = `search-results.html?q=${encodeURIComponent(query)}`;
}

// Create search result card (similar to film card)
function createSearchResultCard(film) {
    const card = document.createElement('div');
    card.className = 'film-card';

    card.innerHTML = `
        <div class="film-poster">
            <img src="assets/images/${film.imageFolder}/${film.image}" alt="${film.title}" onerror="this.onerror=null; this.style.display='none';">
            ${film.trailer ? `<div class="play-overlay" data-trailer="${film.trailer}" data-title="${film.title}">
                <svg class="play-icon" viewBox="0 0 24 24" fill="white">
                    <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.6)" stroke="white" stroke-width="1"/>
                    <polygon points="10,8 17,12 10,16" fill="white"/>
                </svg>
            </div>` : ''}
        </div>
        <div class="film-content">
            <h3 class="film-title clickable-title" style="cursor: pointer; text-decoration: underline;" data-title="${film.title}" data-season="${film.season}">${film.title}</h3>
            <div class="film-date-genre">
                <p class="film-date">${film.date}</p>
                <div class="film-genre">${film.genre}</div>
            </div>
            <div class="film-badges">
                <div class="badges-left">
                    ${
                        film.rtScore && film.rottenTomatoes
                            ? `<a href="${film.rottenTomatoes}" target="_blank" rel="noopener noreferrer" class="rt-score ${parseInt(film.rtScore) < 60 ? "rotten" : "fresh"}">${parseInt(film.rtScore) < 60 ? "🤢" : "🍅"} ${film.rtScore}%</a>`
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
                        ? `<a href="reactions.html?season=${film.season}#${encodeURIComponent(film.title.replace(/\s+/g, '-').toLowerCase())}" class="bfs-score"><img src="assets/images/spool_logo.gif" alt="BFS" class="bfs-icon"> ${film.overallScore}%</a>`
                        : ""
                }
            </div>
            ${film.note ? `<p class="film-note">${film.note}</p>` : ""}
            <p class="film-description">${film.description}</p>
            <p class="film-info">${film.info}</p>
            <!-- <div class="film-actions">
                ${film.trailer ? `<button class="trailer-btn" data-trailer="${film.trailer}" data-title="${film.title}">▶ Watch Trailer</button>` : ""}
            </div> -->
        </div>
    `;

    // Add trailer button click handler (commented out - now using play overlay)
    // if (film.trailer) {
    //     const trailerBtn = card.querySelector('.trailer-btn');
    //     trailerBtn.addEventListener('click', () => {
    //         window.open(`https://www.youtube.com/watch?v=${film.trailer}`, '_blank');
    //     });
    // }

    // Add play overlay click handler
    if (film.trailer) {
        const playOverlay = card.querySelector('.play-overlay');
        playOverlay.addEventListener('click', () => {
            window.open(`https://www.youtube.com/watch?v=${film.trailer}`, '_blank');
        });
    }

    // Add click handler for title to link to programme page
    const titleElement = card.querySelector('.clickable-title');
    if (titleElement) {
        titleElement.addEventListener('click', () => {
            const filmSlug = film.title.replace(/\s+/g, '-').toLowerCase();
            window.location.href = `programme.html?season=${film.season}#${encodeURIComponent(filmSlug)}`;
        });
    }

    return card;
}

// Handle search button click
document.getElementById('search-button').addEventListener('click', () => {
    const query = document.getElementById('search-input').value;
    searchFilms(query);
});

// Handle Enter key in search input
document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = document.getElementById('search-input').value;
        searchFilms(query);
    }
});
