// Execute search on page load based on URL parameter
window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');

    if (query) {
        document.getElementById('search-query').textContent = `Results for: "${query}"`;
        await executeSearch(query);
    } else {
        document.getElementById('search-query').textContent = 'No search query provided';
        document.getElementById('no-results').style.display = 'block';
    }
});

// Execute the actual search
async function executeSearch(query) {
    if (!query || query.trim().length < 2) {
        document.getElementById('no-results').style.display = 'block';
        return;
    }

    document.getElementById('search-loading').style.display = 'block';
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('no-results').style.display = 'none';

    const searchTerm = query.toLowerCase().trim();
    const allResults = [];

    for (const [seasonName, seasonConfig] of Object.entries(SEASONS)) {
        try {
            // Fetch programme and reactions data in parallel
            const [programmeResponse, reactionsScores] = await Promise.all([
                fetch(`https://docs.google.com/spreadsheets/d/${seasonConfig.sheetId}/gviz/tq?tqx=out:json&headers=1`),
                fetchReactionsScoresForSearch(seasonName)
            ]);

            const text = await programmeResponse.text();
            const json = JSON.parse(text.substr(47).slice(0, -2));
            const rows = json.table.rows;

            rows.forEach(row => {
                const cells = row.c;
                if (!cells || !cells[1] || !cells[1].v) return;

                const title = cells[1]?.v || "";

                // Search in title
                if (title.toLowerCase().includes(searchTerm)) {
                    const film = {
                        season: seasonName,
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
                        imageFolder: seasonConfig.imageFolder,
                    };
                    allResults.push(film);
                }
            });
        } catch (error) {
            console.error(`Error searching season ${seasonName}:`, error);
        }
    }

    document.getElementById('search-loading').style.display = 'none';

    if (allResults.length === 0) {
        document.getElementById('no-results').style.display = 'block';
    } else {
        displaySearchResults(allResults);
    }
}

// Display search results
function displaySearchResults(films) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';

    films.forEach(film => {
        const card = createSearchResultCard(film);
        resultsContainer.appendChild(card);
    });
}
