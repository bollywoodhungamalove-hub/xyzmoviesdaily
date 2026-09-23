// ============================================
// XYZMOVIEDAILY
// Main Application
// ============================================

const CINEMETA_API = "https://v3-cinemeta.strem.io";

const MOVIES_PER_SECTION = 24;

const metadataCache = new Map();


// ============================================
// DOM HELPERS
// ============================================

function $(id) {
    return document.getElementById(id);
}


// ============================================
// APP STATE
// ============================================

let allMovies = [];
let loadedMovies = [];


// ============================================
// START APPLICATION
// ============================================

document.addEventListener("DOMContentLoaded", () => {

    if (typeof MOVIE_DATABASE === "undefined") {
        showError(
            "movies.js was not loaded. Make sure movies.js is in the same folder as index.html."
        );
        return;
    }

    initializeSite();

});


// ============================================
// INITIALIZE
// ============================================

async function initializeSite() {

    hideError();

    showLoading(true);

    updateYear();

    setupSearch();

    setupNavigation();

    buildMovieList();

    await loadMovieMetadata();

    renderAllSections();

    showLoading(false);

}


// ============================================
// BUILD MOVIE LIST
// ============================================

function buildMovieList() {

    allMovies = [];

    const categories = [
        "bollywood",
        "south",
        "tamil",
        "telugu",
        "malayalam",
        "kannada"
    ];

    categories.forEach(category => {

        if (!Array.isArray(MOVIE_DATABASE[category])) {
            return;
        }

        MOVIE_DATABASE[category].forEach(movie => {

            if (!movie || !movie.id) {
                return;
            }

            allMovies.push({
                ...movie,
                category
            });

        });

    });


    // Remove duplicate IMDb IDs
    const uniqueMovies = new Map();

    allMovies.forEach(movie => {

        if (!uniqueMovies.has(movie.id)) {
            uniqueMovies.set(movie.id, movie);
        }

    });

    allMovies = Array.from(uniqueMovies.values());

}


// ============================================
// LOAD CINEMETA METADATA
// ============================================

async function loadMovieMetadata() {

    if (!allMovies.length) {
        return;
    }

    const BATCH_SIZE = 8;

    loadedMovies = [];

    for (let i = 0; i < allMovies.length; i += BATCH_SIZE) {

        const batch = allMovies.slice(i, i + BATCH_SIZE);

        const results = await Promise.all(
            batch.map(movie => fetchMovieMetadata(movie))
        );

        results.forEach(movie => {

            if (movie) {
                loadedMovies.push(movie);
            }

        });

        updateLoadingProgress(
            Math.min(i + BATCH_SIZE, allMovies.length),
            allMovies.length
        );

    }

}


// ============================================
// FETCH ONE MOVIE
// ============================================

async function fetchMovieMetadata(movie) {

    if (metadataCache.has(movie.id)) {
        return metadataCache.get(movie.id);
    }

    try {

        const url =
            `${CINEMETA_API}/meta/movie/${movie.id}.json`;

        const response = await fetch(url);

        if (!response.ok) {
            return createFallbackMovie(movie);
        }

        const data = await response.json();

        if (!data || !data.meta) {
            return createFallbackMovie(movie);
        }

        const meta = data.meta;

        const result = {

            ...movie,

            id: movie.id,

            title:
                meta.name ||
                movie.title ||
                "Unknown Movie",

            poster:
                meta.poster ||
                "",

            background:
                meta.background ||
                meta.poster ||
                "",

            description:
                meta.description ||
                "Movie information unavailable.",

            year:
                getMovieYear(meta, movie),

            rating:
                Number(meta.imdbRating) || 0,

            genres:
                Array.isArray(meta.genre)
                    ? meta.genre
                    : [],

            releaseInfo:
                meta.releaseInfo ||
                "",

            runtime:
                meta.runtime ||
                "",

            director:
                Array.isArray(meta.director)
                    ? meta.director
                    : [],

            cast:
                Array.isArray(meta.cast)
                    ? meta.cast
                    : [],

            trailers:
                Array.isArray(meta.trailers)
                    ? meta.trailers
                    : []

        };

        metadataCache.set(movie.id, result);

        return result;

    } catch (error) {

        console.warn(
            "Cinemeta error:",
            movie.id,
            error
        );

        return createFallbackMovie(movie);

    }

}


// ============================================
// FALLBACK MOVIE
// ============================================

function createFallbackMovie(movie) {

    const result = {

        ...movie,

        title:
            movie.title ||
            "Unknown Movie",

        poster: "",

        background: "",

        description:
            "Movie information unavailable.",

        year:
            movie.year || "",

        rating: 0,

        genres: [],

        releaseInfo: "",

        runtime: "",

        director: [],

        cast: [],

        trailers: []

    };

    metadataCache.set(movie.id, result);

    return result;

}


// ============================================
// GET YEAR
// ============================================

function getMovieYear(meta, movie) {

    if (meta.releaseInfo) {

        const match =
            String(meta.releaseInfo).match(/\d{4}/);

        if (match) {
            return Number(match[0]);
        }

    }

    if (meta.year) {
        return Number(meta.year);
    }

    return movie.year || "";

}


// ============================================
// RENDER EVERYTHING
// ============================================

function renderAllSections() {

    renderCategory(
        "bollywood",
        "bollywoodGrid",
        "bollywoodCount"
    );

    renderCategory(
        "south",
        "southGrid",
        "southCount"
    );

    renderCategory(
        "tamil",
        "tamilGrid",
        "tamilCount"
    );

    renderCategory(
        "telugu",
        "teluguGrid",
        "teluguCount"
    );

    renderCategory(
        "malayalam",
        "malayalamGrid",
        "malayalamCount"
    );

    renderCategory(
        "kannada",
        "kannadaGrid",
        "kannadaCount"
    );

    renderHindiMovies();

    renderTrending();

    renderFeatured();

    renderNewMovies();

    renderAllMovies();

    renderGenres();

}


// ============================================
// CATEGORY RENDER
// ============================================

function renderCategory(
    category,
    gridId,
    countId
) {

    const grid = $(gridId);
    const count = $(countId);

    if (!grid) {
        return;
    }

    const movies =
        loadedMovies.filter(
            movie => movie.category === category
        );

    if (count) {
        count.textContent = movies.length;
    }

    grid.innerHTML = "";

    movies
        .slice(0, MOVIES_PER_SECTION)
        .forEach(movie => {

            grid.appendChild(
                createMovieCard(movie)
            );

        });

}


// ============================================
// HINDI MOVIES
// ============================================

function renderHindiMovies() {

    const grid = $("hindiGrid");
    const count = $("hindiCount");

    if (!grid) {
        return;
    }

    const movies = loadedMovies.filter(movie => {

        return (
            movie.category === "bollywood" ||
            movie.title.toLowerCase().includes("hindi")
        );

    });

    if (count) {
        count.textContent = movies.length;
    }

    grid.innerHTML = "";

    movies
        .slice(0, MOVIES_PER_SECTION)
        .forEach(movie => {

            grid.appendChild(
                createMovieCard(movie)
            );

        });

}


// ============================================
// TRENDING
// ============================================

function renderTrending() {

    const grid = $("trendingGrid");
    const count = $("trendingCount");

    if (!grid) {
        return;
    }

    const movies = [...loadedMovies]
        .sort(
            (a, b) =>
                (b.rating || 0) -
                (a.rating || 0)
        );

    if (count) {
        count.textContent = movies.length;
    }

    grid.innerHTML = "";

    movies
        .slice(0, MOVIES_PER_SECTION)
        .forEach(movie => {

            grid.appendChild(
                createMovieCard(movie)
            );

        });

}


// ============================================
// FEATURED / TOP RATED
// ============================================

function renderFeatured() {

    const grid = $("featuredGrid");
    const count = $("featuredCount");

    if (!grid) {
        return;
    }

    const movies = [...loadedMovies]
        .sort(
            (a, b) =>
                (b.rating || 0) -
                (a.rating || 0)
        );

    if (count) {
        count.textContent = movies.length;
    }

    grid.innerHTML = "";

    movies
        .slice(0, MOVIES_PER_SECTION)
        .forEach(movie => {

            grid.appendChild(
                createMovieCard(movie)
            );

        });

}


// ============================================
// NEW MOVIES
// ============================================

function renderNewMovies() {

    const grid = $("newGrid");
    const count = $("newCount");

    if (!grid) {
        return;
    }

    const movies = [...loadedMovies]
        .sort(
            (a, b) =>
                (b.year || 0) -
                (a.year || 0)
        );

    if (count) {
        count.textContent = movies.length;
    }

    grid.innerHTML = "";

    movies
        .slice(0, MOVIES_PER_SECTION)
        .forEach(movie => {

            grid.appendChild(
                createMovieCard(movie)
            );

        });

}


// ============================================
// ALL MOVIES
// ============================================

function renderAllMovies() {

    const grid = $("allGrid");
    const count = $("allCount");

    if (!grid) {
        return;
    }

    const movies = [...loadedMovies]
        .sort(
            (a, b) =>
                (b.year || 0) -
                (a.year || 0)
        );

    if (count) {
        count.textContent = movies.length;
    }

    grid.innerHTML = "";

    movies
        .slice(0, 48)
        .forEach(movie => {

            grid.appendChild(
                createMovieCard(movie)
            );

        });

}


// ============================================
// GENRES
// ============================================

function renderGenres() {

    const genres = {

        "Action": [
            "actionGrid",
            "actionCount"
        ],

        "Comedy": [
            "comedyGrid",
            "comedyCount"
        ],

        "Romance": [
            "romanceGrid",
            "romanceCount"
        ],

        "Thriller": [
            "thrillerGrid",
            "thrillerCount"
        ],

        "Horror": [
            "horrorGrid",
            "horrorCount"
        ],

        "Drama": [
            "dramaGrid",
            "dramaCount"
        ],

        "Sci-Fi": [
            "sci-fiGrid",
            "sci-fiCount"
        ],

        "Crime": [
            "crimeGrid",
            "crimeCount"
        ],

        "Fantasy": [
            "fantasyGrid",
            "fantasyCount"
        ],

        "Adventure": [
            "adventureGrid",
            "adventureCount"
        ],

        "Animation": [
            "animationGrid",
            "animationCount"
        ]

    };


    Object.entries(genres).forEach(
        ([genre, ids]) => {

            const grid = $(ids[0]);
            const count = $(ids[1]);

            if (!grid) {
                return;
            }

            const movies =
                loadedMovies.filter(movie =>
                    movie.genres.some(g =>
                        String(g)
                            .toLowerCase()
                            .includes(
                                genre.toLowerCase()
                            )
                    )
                );

            if (count) {
                count.textContent = movies.length;
            }

            grid.innerHTML = "";

            movies
                .slice(0, MOVIES_PER_SECTION)
                .forEach(movie => {

                    grid.appendChild(
                        createMovieCard(movie)
                    );

                });

        }
    );

}


// ============================================
// CREATE MOVIE CARD
// ============================================

function createMovieCard(movie) {

    const card =
        document.createElement("article");

    card.className = "movie-card";

    card.tabIndex = 0;


    // ----------------------------------------
    // Poster
    // ----------------------------------------

    const poster =
        document.createElement("div");

    poster.className = "movie-poster";


    if (movie.poster) {

        const image =
            document.createElement("img");

        image.src = movie.poster;

        image.alt =
            `${movie.title} poster`;

        image.loading = "lazy";

        image.onerror = () => {

            image.style.display = "none";

            poster.classList.add(
                "poster-fallback"
            );

            poster.innerHTML =
                `<span>${escapeHTML(movie.title)}</span>`;

        };

        poster.appendChild(image);

    } else {

        poster.classList.add(
            "poster-fallback"
        );

        poster.innerHTML =
            `<span>${escapeHTML(movie.title)}</span>`;

    }


    // ----------------------------------------
    // Info
    // ----------------------------------------

    const info =
        document.createElement("div");

    info.className = "movie-info";


    const title =
        document.createElement("h3");

    title.textContent =
        movie.title;


    const meta =
        document.createElement("div");

    meta.className = "movie-meta";


    if (movie.year) {

        const year =
            document.createElement("span");

        year.textContent =
            movie.year;

        meta.appendChild(year);

    }


    if (movie.rating) {

        const rating =
            document.createElement("span");

        rating.textContent =
            `★ ${movie.rating.toFixed(1)}`;

        meta.appendChild(rating);

    }


    info.appendChild(title);

    info.appendChild(meta);


    card.appendChild(poster);

    card.appendChild(info);


    // ----------------------------------------
    // Click
    // ----------------------------------------

    card.addEventListener(
        "click",
        () => openMovie(movie)
    );


    card.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                openMovie(movie);

            }

        }
    );


    return card;

}


// ============================================
// OPEN MOVIE
// ============================================

function openMovie(movie) {

    const query =
        `${movie.title} official trailer`;

    const youtubeURL =
        `https://www.youtube.com/results?search_query=` +
        encodeURIComponent(query);

    window.open(
        youtubeURL,
        "_blank",
        "noopener,noreferrer"
    );

}


// ============================================
// SEARCH
// ============================================

function setupSearch() {

    const searchInput =
        $("searchInput");

    const clearButton =
        $("clearSearch");

    if (!searchInput) {
        return;
    }


    searchInput.addEventListener(
        "input",
        () => {

            const query =
                searchInput.value
                    .trim()
                    .toLowerCase();

            if (clearButton) {

                clearButton.style.display =
                    query ? "block" : "none";

            }

            if (!query) {

                hideSearchResults();

                return;

            }

            searchMovies(query);

        }
    );


    if (clearButton) {

        clearButton.addEventListener(
            "click",
            () => {

                searchInput.value = "";

                clearButton.style.display =
                    "none";

                hideSearchResults();

                searchInput.focus();

            }
        );

    }

}


// ============================================
// SEARCH MOVIES
// ============================================

function searchMovies(query) {

    const section =
        $("searchResultsSection");

    const grid =
        $("searchResultsGrid");

    const count =
        $("searchCount");

    const noResults =
        $("noResults");


    if (!section || !grid) {
        return;
    }


    const results =
        loadedMovies.filter(movie => {

            const title =
                movie.title
                    .toLowerCase();

            const genreText =
                movie.genres
                    .join(" ")
                    .toLowerCase();

            return (
                title.includes(query) ||
                genreText.includes(query)
            );

        });


    section.style.display =
        "block";


    grid.innerHTML = "";


    if (count) {
        count.textContent =
            results.length;
    }


    if (!results.length) {

        if (noResults) {
            noResults.style.display =
                "block";
        }

        return;

    }


    if (noResults) {
        noResults.style.display =
            "none";
    }


    results
        .slice(0, 60)
        .forEach(movie => {

            grid.appendChild(
                createMovieCard(movie)
            );

        });


    section.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


// ============================================
// HIDE SEARCH
// ============================================

function hideSearchResults() {

    const section =
        $("searchResultsSection");

    const noResults =
        $("noResults");

    if (section) {
        section.style.display =
            "none";
    }

    if (noResults) {
        noResults.style.display =
            "none";
    }

}


// ============================================
// NAVIGATION
// ============================================

function setupNavigation() {

    const links =
        document.querySelectorAll(
            "[data-section]"
        );


    links.forEach(link => {

        link.addEventListener(
            "click",
            event => {

                const target =
                    link.getAttribute(
                        "data-section"
                    );

                if (!target) {
                    return;
                }

                const section =
                    $(target);

                if (!section) {
                    return;
                }

                event.preventDefault();

                section.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }
        );

    });

}


// ============================================
// YEAR
// ============================================

function updateYear() {

    const year =
        $("currentYear");

    if (year) {
        year.textContent =
            new Date().getFullYear();
    }

}


// ============================================
// LOADING
// ============================================

function showLoading(show) {

    const loading =
        $("loading");

    if (!loading) {
        return;
    }

    loading.style.display =
        show ? "flex" : "none";

}


function updateLoadingProgress(
    current,
    total
) {

    const loading =
        $("loading");

    if (!loading) {
        return;
    }

    const percentage =
        Math.round(
            (current / total) * 100
        );


    const text =
        loading.querySelector(
            "p"
        );


    if (text) {

        text.textContent =
            `Loading movies... ${percentage}%`;

    }

}


// ============================================
// ERROR
// ============================================

function showError(message) {

    const box =
        $("errorBox");

    const text =
        $("errorText");


    if (text) {
        text.textContent =
            message;
    }

    if (box) {
        box.style.display =
            "block";
    }

}


function hideError() {

    const box =
        $("errorBox");

    if (box) {
        box.style.display =
            "none";
    }

}


// ============================================
// RETRY
// ============================================

const retryButton =
    $("retryButton");

if (retryButton) {

    retryButton.addEventListener(
        "click",
        () => {
            window.location.reload();
        }
    );

}


// ============================================
// HTML ESCAPE
// ============================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
