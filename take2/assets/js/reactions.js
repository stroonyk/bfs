        // Season configurations
        const SEASONS = {
            "2026-2027": {
                reactionsSheetId: "1gGzlsbLcCreHIi4SJEtFI1dulLZ5ZbphNiV5bWVZ-1c",
                programmeSheetId: "1fSd1buNLplD0cQckUExRV4ODb-uk144iLuZq8tae8vc",
                imageFolder: "2627"
            },
            "2025-2026": {
                reactionsSheetId: "1zgoxxY_lh7jzNhsrQJPGLTUMBmC9eULAizFpSXzWSoU",
                programmeSheetId: "1VwKUYCRjdFuKsbI5qXw3ulOCmlJBe2nGIyyoa36sTpo",
                imageFolder: "2526"
            }
        };

        let currentSeason = "2025-2026";
        let isLoading = false;
        let allReactions = []; // Store all reactions for sorting

        // Get season from URL parameter or default to current
        function getInitialSeason() {
            const urlParams = new URLSearchParams(window.location.search);
            const seasonParam = urlParams.get('season');
            return seasonParam && SEASONS[seasonParam] ? seasonParam : "2025-2026";
        }

        // Fetch programme data to get film images
        async function fetchProgrammeImages(season) {
            const seasonConfig = SEASONS[season];
            try {
                const response = await fetch(`https://docs.google.com/spreadsheets/d/${seasonConfig.programmeSheetId}/gviz/tq?tqx=out:json&headers=1`);
                const text = await response.text();
                const json = JSON.parse(text.substr(47).slice(0, -2));

                const imageMap = {};
                json.table.rows.forEach(row => {
                    const cells = row.c;
                    if (cells && cells[1] && cells[6]) {
                        const title = cells[1].v;
                        const image = cells[6].v;
                        if (title && image) {
                            // Store with both original and normalized keys for flexible matching
                            imageMap[title] = image;
                            imageMap[title.trim().toLowerCase()] = image;
                        }
                    }
                });
                return imageMap;
            } catch (error) {
                console.error('Error fetching programme images:', error);
                return {};
            }
        }

        // Fetch and display reactions
        async function loadReactions(season) {
            return new Promise(async (resolve, reject) => {
            if (isLoading) return;
            isLoading = true;

            currentSeason = season || currentSeason;
            const seasonConfig = SEASONS[currentSeason];

            try {
                // First, get the image mapping from programme sheet
                const imageMap = await fetchProgrammeImages(currentSeason);

                // Then fetch reactions data
                const response = await fetch(`https://docs.google.com/spreadsheets/d/${seasonConfig.reactionsSheetId}/gviz/tq?tqx=out:json&headers=1`);
                const text = await response.text();
                const json = JSON.parse(text.substr(47).slice(0, -2));
                const rows = json.table.rows;

                document.getElementById('loading').style.display = 'none';

                const reactionsGrid = document.getElementById('reactions-grid');
                reactionsGrid.innerHTML = '';

                allReactions = []; // Reset reactions array

                let totalFilms = 0;
                let totalAttendance = 0;
                let totalExcellent = 0;
                let totalResponses = 0;
                let bestFilm = null;
                let worstFilm = null;
                let bestRating = -1;
                let worstRating = 101;

                // Process each row
                rows.forEach(row => {
                    const cells = row.c;

                    if (!cells || !cells[1] || !cells[1].v) return;

                    // Parse attendance (could be "X-Y" format or just a number)
                    const parseAttendance = (cell) => {
                        if (!cell) return { total: 0, members: 0, nonMembers: 0, raw: null };

                        const val = cell.f || cell.v;
                        if (!val) return { total: 0, members: 0, nonMembers: 0, raw: null };

                        const str = String(val);
                        if (str.includes('-')) {
                            const parts = str.split('-');
                            const members = parseInt(parts[0] || 0);
                            const nonMembers = parseInt(parts[1] || 0);
                            return {
                                total: members + nonMembers,
                                members: members,
                                nonMembers: nonMembers,
                                raw: str
                            };
                        }
                        const num = parseInt(val) || 0;
                        return { total: num, members: num, nonMembers: 0, raw: str };
                    };

                    const attendance1 = parseAttendance(cells[2]);
                    const attendance2 = parseAttendance(cells[3]);

                    const title = cells[1]?.v || '';

                    const reaction = {
                        date: cells[0]?.v || '',
                        title: title,
                        attendance1: attendance1,
                        attendance2: attendance2,
                        totalAttendance: attendance1.total + attendance2.total,
                        totalMembers: attendance1.members + attendance2.members,
                        totalNonMembers: attendance1.nonMembers + attendance2.nonMembers,
                        excellent: parseInt(cells[4]?.v) || 0,
                        good: parseInt(cells[5]?.v) || 0,
                        fair: parseInt(cells[6]?.v) || 0,
                        poor: parseInt(cells[7]?.v) || 0,
                        awful: parseInt(cells[8]?.v) || 0,
                        image: imageMap[title] || imageMap[title.trim().toLowerCase()] || ''
                    };

                    // Calculate totals
                    const totalRatings = reaction.excellent + reaction.good + reaction.fair + reaction.poor + reaction.awful;

                    // Only show films with ratings
                    if (totalRatings > 0) {
                        totalFilms++;
                        totalAttendance += reaction.totalAttendance;
                        totalExcellent += reaction.excellent;
                        totalResponses += totalRatings;

                        // Calculate overall rating for best/worst tracking
                        const weightedScore = (reaction.excellent * 1) + (reaction.good * 0.75) + (reaction.fair * 0.5) + (reaction.poor * 0.25);
                        const overallRating = Math.round((weightedScore / totalRatings) * 100);

                        // Track best and worst
                        if (overallRating > bestRating) {
                            bestRating = overallRating;
                            bestFilm = { title: reaction.title, rating: overallRating, image: reaction.image };
                        }
                        if (overallRating < worstRating) {
                            worstRating = overallRating;
                            worstFilm = { title: reaction.title, rating: overallRating, image: reaction.image };
                        }

                        // Store reaction with its calculated overall rating
                        allReactions.push({
                            data: reaction,
                            overallRating: overallRating
                        });
                    }
                });

                // Display all reactions
                displayReactions(allReactions);

                // Update stats banner
                if (totalFilms > 0) {
                    document.getElementById('total-films').textContent = totalFilms;
                    document.getElementById('total-attendance').textContent = totalAttendance;
                    document.getElementById('avg-rating').textContent = Math.round((totalExcellent / totalResponses) * 100) + '%';
                }

                // Update best/worst section and show container
                if (bestFilm && worstFilm && totalFilms > 0) {
                    document.getElementById('stats-best-worst-container').style.display = 'flex';
                    document.getElementById('sort-container').style.display = 'flex';
                    document.getElementById('best-film-title').textContent = bestFilm.title;
                    document.getElementById('best-film-rating').textContent = bestFilm.rating + '%';
                    document.getElementById('worst-film-title').textContent = worstFilm.title;
                    document.getElementById('worst-film-rating').textContent = worstFilm.rating + '%';

                    // Determine colors based on ratings
                    let bestColor = '#0AC855';
                    if (bestFilm.rating >= 80) {
                        bestColor = '#fa320a';
                    } else if (bestFilm.rating >= 60) {
                        bestColor = '#ff8c00';
                    }

                    let worstColor = '#0AC855';
                    if (worstFilm.rating >= 80) {
                        worstColor = '#fa320a';
                    } else if (worstFilm.rating >= 60) {
                        worstColor = '#ff8c00';
                    }

                    // Add background images and border colors
                    const bestCard = document.querySelector('.best-worst-card.best');
                    const worstCard = document.querySelector('.best-worst-card.worst');

                    if (bestFilm.image && bestCard) {
                        bestCard.style.backgroundImage = `url('assets/images/${seasonConfig.imageFolder}/${bestFilm.image}')`;
                        bestCard.style.borderColor = bestColor;
                    }
                    if (worstFilm.image && worstCard) {
                        worstCard.style.backgroundImage = `url('assets/images/${seasonConfig.imageFolder}/${worstFilm.image}')`;
                        worstCard.style.borderColor = worstColor;
                    }

                    // Trigger shudder and confetti after 2 seconds
                    setTimeout(() => {
                        if (bestCard) {
                            // Add shudder animation
                            bestCard.classList.add('shudder');

                            // Remove shudder class after animation
                            setTimeout(() => {
                                bestCard.classList.remove('shudder');
                            }, 600);

                            // Trigger confetti explosion mid-shudder
                            setTimeout(() => {
                                triggerConfetti();
                            }, 300);
                        }
                    }, 2000);
                }

            } catch (error) {
                console.error('Error loading reactions:', error);
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'block';
                reject(error);
            } finally {
                isLoading = false;
                resolve();
            }
            });
        }

        // Display reactions in the grid
        function displayReactions(reactionsArray) {
            const reactionsGrid = document.getElementById('reactions-grid');
            reactionsGrid.innerHTML = '';

            reactionsArray.forEach(item => {
                const card = createReactionCard(item.data, item.overallRating);
                reactionsGrid.appendChild(card);
            });
        }

        // Sort reactions
        function sortReactions(sortBy) {
            let sortedReactions = [...allReactions];

            if (sortBy === 'score') {
                // Sort by overall score (highest first)
                sortedReactions.sort((a, b) => b.overallRating - a.overallRating);
            }
            // Default is date order (original order from spreadsheet)

            displayReactions(sortedReactions);
        }

        // Create a reaction card
        function createReactionCard(reaction, overallRating) {
            const card = document.createElement('div');
            card.className = 'reaction-card';
            card.id = reaction.title.replace(/\s+/g, '-').toLowerCase();

            const total = reaction.excellent + reaction.good + reaction.fair + reaction.poor + reaction.awful;

            const ratings = [
                { label: 'Excellent', count: reaction.excellent, color: '#fa320a' },
                { label: 'Good', count: reaction.good, color: '#ff8c00' },
                { label: 'Fair', count: reaction.fair, color: '#f39c12' },
                { label: 'Poor', count: reaction.poor, color: '#9acd32' },
                { label: 'Awful', count: reaction.awful, color: '#0AC855' }
            ];

            const barsHtml = ratings.map(rating => {
                const percentage = total > 0 ? Math.round((rating.count / total) * 100) : 0;
                return `
                    <div class="rating-row">
                        <div class="rating-label">${rating.label}</div>
                        <div class="rating-bar-container">
                            ${rating.count > 0 ? `<div class="rating-bar" style="width: ${percentage}%; background-color: ${rating.color};"></div>` : ''}
                        </div>
                        <div class="rating-count">${rating.count} (${percentage}%)</div>
                    </div>
                `;
            }).join('');

            const seasonConfig = SEASONS[currentSeason];

            // Determine color based on rating (RT style with orange middle)
            let ratingColor = '#0AC855'; // Green (rotten)
            if (overallRating >= 80) {
                ratingColor = '#fa320a'; // Red (certified fresh)
            } else if (overallRating >= 60) {
                ratingColor = '#ff8c00'; // Orange (fresh)
            }

            card.innerHTML = `
                ${reaction.image ? `<div class="reaction-image"><img src="assets/images/${seasonConfig.imageFolder}/${reaction.image}" alt="${reaction.title}" onerror="this.style.display='none';"></div>` : ''}
                <div class="reaction-header">
                    <div class="title-with-rating">
                        <h3 class="clickable-title" data-title="${reaction.title}" data-season="${currentSeason}">${reaction.title}</h3>
                        <div class="overall-rating" style="background: ${ratingColor};"><img src="assets/images/spool_logo.gif" alt="BFS" class="bfs-icon"> ${overallRating}%</div>
                    </div>
                    <p class="reaction-date">${reaction.date}</p>
                </div>
                <div class="reaction-stats">
                    <div class="stat-item">
                        <div class="attendance-header">
                            <div>
                                <strong>${reaction.totalAttendance}</strong> attended
                            </div>
                            ${reaction.totalMembers > 0 || reaction.totalNonMembers > 0 || reaction.attendance2.total > 0 ? `<button class="attendance-toggle" aria-label="Show attendance details">▼</button>` : ''}
                        </div>
                        ${reaction.totalMembers > 0 || reaction.totalNonMembers > 0 || reaction.attendance2.total > 0 ? `
                        <div class="attendance-details" style="display: none;">
                            ${reaction.totalMembers > 0 || reaction.totalNonMembers > 0 ? `<span class="stat-detail">(${reaction.totalMembers} members, ${reaction.totalNonMembers} non-members)</span>` : ''}
                            ${reaction.attendance2.total > 0 ? `<span class="stat-detail">Night 1: ${reaction.attendance1.total} | Night 2: ${reaction.attendance2.total}</span>` : ''}
                        </div>` : ''}
                    </div>
                    <div class="stat-item">
                        <strong>${total}</strong> responses
                    </div>
                </div>
                <div class="ratings-breakdown">
                    ${barsHtml}
                </div>
            `;

            // Add click handler for attendance toggle
            const toggleBtn = card.querySelector('.attendance-toggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const details = card.querySelector('.attendance-details');
                    if (details.style.display === 'none') {
                        details.style.display = 'block';
                        toggleBtn.classList.add('open');
                    } else {
                        details.style.display = 'none';
                        toggleBtn.classList.remove('open');
                    }
                });
            }

            // Add click handler for title to link to programme page
            const titleElement = card.querySelector('.clickable-title');
            if (titleElement) {
                titleElement.style.cursor = 'pointer';
                titleElement.style.textDecoration = 'underline';
                titleElement.addEventListener('click', () => {
                    const filmSlug = reaction.title.replace(/\s+/g, '-').toLowerCase();
                    window.location.href = `programme.html?season=${currentSeason}#${encodeURIComponent(filmSlug)}`;
                });
            }

            return card;
        }

        // Wedding confetti function
        function triggerConfetti() {
            const bestCard = document.querySelector('.best-worst-card.best');
            if (!bestCard) return;

            const colors = ['#FFD700', '#FF69B4', '#FFC0CB', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C', '#FFB6C1', '#E6E6FA', '#FFDAB9'];
            const confettiCount = 200;
            const shapes = ['rect', 'circle', 'triangle'];

            const rect = bestCard.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            for (let i = 0; i < confettiCount; i++) {
                setTimeout(() => {
                    const confetti = document.createElement('div');
                    confetti.className = 'confetti';

                    const color = colors[Math.floor(Math.random() * colors.length)];
                    const shape = shapes[Math.floor(Math.random() * shapes.length)];

                    // Different shapes
                    if (shape === 'circle') {
                        confetti.style.borderRadius = '50%';
                        confetti.style.width = '8px';
                        confetti.style.height = '8px';
                    } else if (shape === 'triangle') {
                        confetti.style.width = '0';
                        confetti.style.height = '0';
                        confetti.style.borderLeft = '5px solid transparent';
                        confetti.style.borderRight = '5px solid transparent';
                        confetti.style.borderBottom = `10px solid ${color}`;
                        confetti.style.background = 'transparent';
                    } else {
                        confetti.style.background = color;
                        confetti.style.width = (6 + Math.random() * 8) + 'px';
                        confetti.style.height = (10 + Math.random() * 15) + 'px';
                    }

                    if (shape !== 'triangle') {
                        confetti.style.background = color;
                    }

                    // Start from center of card
                    confetti.style.left = centerX + 'px';
                    confetti.style.top = centerY + 'px';

                    // Physics: burst out then fall with gravity
                    const angle = Math.random() * Math.PI * 2; // Random direction
                    const velocity = 80 + Math.random() * 120; // Initial burst velocity
                    const horizontalSpeed = Math.cos(angle) * velocity;

                    // Initial upward burst (negative = up)
                    const upwardBurst = -100 - Math.random() * 150;

                    // Gravity pulls it down much more
                    const fallDistance = 300 + Math.random() * 200;

                    const duration = 2.5 + Math.random() * 1;

                    confetti.style.setProperty('--tx', horizontalSpeed + 'px');
                    confetti.style.setProperty('--ty-up', upwardBurst + 'px'); // Goes up first
                    confetti.style.setProperty('--ty-down', fallDistance + 'px'); // Then gravity takes over
                    confetti.style.setProperty('--rotation', (360 + Math.random() * 1080) + 'deg');
                    confetti.style.setProperty('--duration', duration + 's');

                    bestCard.appendChild(confetti);

                    setTimeout(() => {
                        confetti.classList.add('animate');
                    }, 10);

                    setTimeout(() => {
                        confetti.remove();
                    }, duration * 1000 + 500);
                }, Math.random() * 400);
            }
        }

        // Hamburger menu
        const hamburger = document.getElementById('hamburger');
        const nav = document.getElementById('nav');

        hamburger.addEventListener('click', () => {
            nav.classList.toggle('active');
            hamburger.classList.toggle('active');
        });

        document.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });

        // Season selector change handler
        window.addEventListener('DOMContentLoaded', () => {
            const seasonSelect = document.getElementById("season-select");

            // Populate dropdown from SEASONS config
            Object.keys(SEASONS).forEach(seasonKey => {
                const option = document.createElement("option");
                option.value = seasonKey;
                option.textContent = seasonKey.replace("-", "/");
                seasonSelect.appendChild(option);
            });

            // Set initial season
            currentSeason = getInitialSeason();
            seasonSelect.value = currentSeason;

            // Load reactions for initial season
            loadReactions(currentSeason).then(() => {
                // Scroll to film if hash is in URL
                if (window.location.hash) {
                    const targetId = window.location.hash.substring(1);
                    const targetCard = document.getElementById(targetId);
                    if (targetCard) {
                        setTimeout(() => {
                            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            targetCard.style.outline = '3px solid #FFD700';
                            setTimeout(() => {
                                targetCard.style.outline = '';
                            }, 2000);
                        }, 500);
                    }
                }
            });

            // Handle season change
            seasonSelect.addEventListener("change", (e) => {
                const newSeason = e.target.value;

                // Update URL without reload
                const url = new URL(window.location);
                url.searchParams.set('season', newSeason);
                window.history.pushState({}, '', url);

                // Clear grids and reload
                document.getElementById("reactions-grid").innerHTML = "";
                document.getElementById("stats-best-worst-container").style.display = "none";
                document.getElementById("sort-container").style.display = "none";
                document.getElementById("loading").style.display = "block";
                loadReactions(newSeason);
            });

            // Handle sort change
            const sortSelect = document.getElementById('sort-select');
            sortSelect.addEventListener('change', (e) => {
                sortReactions(e.target.value);
            });
        });
