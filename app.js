// ============================================
// XYZMOVIEDAILY
// Optimized Movie Loading
// ============================================

const CINEMETA_API = "https://v3-cinemeta.strem.io";

const INITIAL_MOVIES = 24;
const BATCH_SIZE = 8;

const metadataCache = new Map();

let allMovies = [];
let loadedMovies = [];


// ============================================
// DOM
// ============================================

function $(id) {
    return document.getElementById(id);
}


// ============================================
// START
// ============================================

document.addEventListener("DOMContentLoaded", () => {

    if (typeof MOVIE_DATABASE === "undefined") {

        showError(
            "movies.js could not be found. Make sure movies.js is in the same folder as index.html."
        );

        return;
    }

    initializeSite();

});


// ============================================
// INITIALIZE
// ============================================

async function initializeSite() {

    updateYear();

    setupSearch();

    setupNavigation();

    buildMovieList();

    showLoading(true);

    /*
     * Load only the first batch initially.
     * This keeps the website fast.
     */

    const firstBatch =
        allMovies.slice(0, INITIAL_MOVIES);

    const movies =
        await loadBatch(firstBatch);

    loadedMovies.push(...movies);

    renderAllSections();

    showLoading(false);

}


// ============================================
// BUILD LOCAL MOVIE LIST
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

        const list =
            MOVIE_DATABASE[category];

        if (!Array.isArray(list)) {
            return;
        }


        list.forEach(movie => {

            if (!movie || !movie.id) {
                return;
            }


            allMovies.push({

                ...movie,

                category

            });

        });

    });


    /*
     * Remove duplicate IMDb IDs.
     */

    const unique =
        new Map();


    allMovies.forEach(movie => {

        if (!unique.has(movie.id)) {

            unique.set(
                movie.id,
                movie
            );

        }

    });


    allMovies =
        Array.from(unique.values());


    console.log(
        "Total local movies:",
        allMovies.length
    );

}


// ============================================
// LOAD MOVIE BATCH
// ============================================

async function loadBatch(batch) {

    if (!batch.length) {
        return [];
    }


    const results = [];


    for (
        let i = 0;
        i < batch.length;
        i += BATCH_SIZE
    ) {

        const smallBatch =
            batch.slice(
                i,
                i + BATCH_SIZE
            );


        const response =
            await Promise.all(
                smallBatch.map(
                    movie =>
                        fetchMovieMetadata(movie)
                )
            );


        response.forEach(movie => {

            if (movie) {
                results.push(movie);
            }

        });

    }


    return results;

}


// ============================================
// CINEMETA METADATA
// ============================================

async function fetchMovieMetadata(movie) {

    if (
        metadataCache.has(
            movie.id
        )
    ) {

        return metadataCache.get(
            movie.id
        );

    }


    try {

        const url =
            `${CINEMETA_API}/meta/movie/${movie.id}.json`;


        const response =
            await fetch(url);


        if (!response.ok) {

            return createFallbackMovie(
                movie
            );

        }


        const data =
            await response.json();


        if (
            !data ||
            !data.meta
        ) {

            return createFallbackMovie(
                movie
            );

        }


        const meta =
            data.meta;


        const result = {

            ...movie,

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
                "",

            year:
                getYear(
                    meta,
                    movie
                ),

            rating:
                Number(
                    meta.imdbRating
                ) || 0,

            genres:
                Array.isArray(
                    meta.genre
                )
                    ? meta.genre
                    : [],

            trailers:
                Array.isArray(
                    meta.trailers
                )
                    ? meta.trailers
                    : []

        };


        metadataCache.set(
            movie.id,
            result
        );


        return result;

    }
    catch (error) {

        console.warn(
            "Cinemeta request failed:",
            movie.id
        );


        return createFallbackMovie(
            movie
        );

    }

}


// ============================================
// FALLBACK
// ============================================

function createFallbackMovie(movie) {

    const result = {

        ...movie,

        title:
            movie.title ||
            "Unknown Movie",

        poster: "",

        background: "",

        description: "",

        year:
            movie.year || "",

        rating: 0,

        genres: [],

        trailers: []

    };


    metadataCache.set(
        movie.id,
        result
    );


    return result;

}


// ============================================
// YEAR
// ============================================

function getYear(
    meta,
    movie
) {

    if (meta.releaseInfo) {

        const match =
            String(
                meta.releaseInfo
            ).match(/\d{4}/);


        if (match) {

            return Number(
                match[0]
            );

        }

    }


    if (meta.year) {

        return Number(
            meta.year
        );

    }


    return movie.year || "";

}


// ============================================
// RENDER ALL SECTIONS
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


    renderHindi();


    renderTrending();


    renderFeatured();


    renderNewMovies();


    renderAllMovies();


    renderGenres();

}


// ============================================
// CATEGORY
// ============================================

function renderCategory(
    category,
    gridId,
    countId
) {

    const grid =
        $(gridId);


    if (!grid) {
        return;
    }


    const movies =
        loadedMovies.filter(
            movie =>
                movie.category === category
        );


    const count =
        $(countId);


    if (count) {

        count.textContent =
            movies.length;

    }


    grid.innerHTML = "";


    movies
        .slice(
            0,
            INITIAL_MOVIES
        )
        .forEach(movie => {

            grid.appendChild(
                createMovieCard(movie)
            );

        });

}


// ============================================
// HINDI
// ============================================

function renderHindi() {

    const grid =
        $("hindiGrid");


    if (!grid) {
        return;
    }


    const movies =
        loadedMovies.filter(
            movie =>
                movie.category ===
                "bollywood"
        );


    const count =
        $("hindiCount");


    if (count) {

        count.textContent =
            movies.length;

    }


    grid.innerHTML = "";


    movies
        .slice(
            0,
            INITIAL_MOVIES
        )
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

    const grid =
        $("trendingGrid");


    if (!grid) {
        return;
    }


    const movies =
        [...loadedMovies]
            .sort(
                (a, b) =>
                    (b.rating || 0) -
                    (a.rating || 0)
            );


    const count =
        $("trendingCount");


    if (count) {

        count.textContent =
            movies.length;

    }


    grid.innerHTML = "";


    movies
        .slice(
            0,
            INITIAL_MOVIES
        )
        .forEach(movie => {

            grid.appendChild(
                createMovieCard(movie)
            );

        });

}


// ============================================
// FEATURED
// ============================================

function renderFeatured() {

    const grid =
        $("featuredGrid");


    if (!grid) {
        return;
    }


    const movies =
        [...loadedMovies]
            .sort(
                (a, b) =>
                    (b.rating || 0) -
                    (a.rating || 0)
            );


    const count =
        $("featuredCount");


    if (count) {

        count.textContent =
            movies.length;

    }


    grid.innerHTML = "";


    movies
        .slice(
            0,
            INITIAL_MOVIES
        )
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

    const grid =
        $("newGrid");


    if (!grid) {
        return;
    }


    const movies =
        [...loadedMovies]
            .sort(
                (a, b) =>
                    (b.year || 0) -
                    (a.year || 0)
            );


    const count =
        $("newCount");


    if (count) {

        count.textContent =
            movies.length;

    }


    grid.innerHTML = "";


    movies
        .slice(
            0,
            INITIAL_MOVIES
        )
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

    const grid =
        $("allGrid");


    if (!grid) {
        return;
    }


    const count =
        $("allCount");


    if (count) {

        count.textContent =
            allMovies.length;

    }


    grid.innerHTML = "";


    loadedMovies
        .slice(
            0,
            48
        )
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

        "Action":
            [
                "actionGrid",
                "actionCount"
            ],

        "Comedy":
            [
                "comedyGrid",
                "comedyCount"
            ],

        "Romance":
            [
                "romanceGrid",
                "romanceCount"
            ],

        "Thriller":
            [
                "thrillerGrid",
                "thrillerCount"
            ],

        "Horror":
            [
                "horrorGrid",
                "horrorCount"
            ],

        "Drama":
            [
                "dramaGrid",
                "dramaCount"
            ],

        "Sci-Fi":
            [
                "sci-fiGrid",
                "sci-fiCount"
            ],

        "Crime":
            [
                "crimeGrid",
                "crimeCount"
            ],

        "Fantasy":
            [
                "fantasyGrid",
                "fantasyCount"
            ],

        "Adventure":
            [
                "adventureGrid",
                "adventureCount"
            ],

        "Animation":
            [
                "animationGrid",
                "animationCount"
            ]

    };


    Object.entries(
        genres
    ).forEach(
        ([genre, ids]) => {

            const grid =
                $(ids[0]);


            if (!grid) {
                return;
            }


            const movies =
                loadedMovies.filter(
                    movie =>
                        movie.genres.some(
                            item =>
                                String(item)
                                    .toLowerCase()
                                    .includes(
                                        genre.toLowerCase()
                                    )
                        )
                );


            const count =
                $(ids[1]);


            if (count) {

                count.textContent =
                    movies.length;

            }


            grid.innerHTML = "";


            movies
                .slice(
                    0,
                    INITIAL_MOVIES
                )
                .forEach(
                    movie => {

                        grid.appendChild(
                            createMovieCard(
                                movie
                            )
                        );

                    }
                );

        }
    );

}


// ============================================
// MOVIE CARD
// ============================================

function createMovieCard(movie) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "movie-card";


    const poster =
        document.createElement(
            "div"
        );


    poster.className =
        "movie-poster";


    if (movie.poster) {

        const image =
            document.createElement(
                "img"
            );


        image.src =
            movie.poster;


        image.alt =
            `${movie.title} poster`;


        image.loading =
            "lazy";


        image.onerror = () => {

            image.remove();

            poster.classList.add(
                "poster-fallback"
            );


            poster.innerHTML =
                `<span>${escapeHTML(movie.title)}</span>`;

        };


        poster.appendChild(
            image
        );

    }
    else {

        poster.classList.add(
            "poster-fallback"
        );


        poster.innerHTML =
            `<span>${escapeHTML(movie.title)}</span>`;

    }


    const info =
        document.createElement(
            "div"
        );


    info.className =
        "movie-info";


    const title =
        document.createElement(
            "h3"
        );


    title.textContent =
        movie.title;


    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        "movie-meta";


    if (movie.year) {

        const year =
            document.createElement(
                "span"
            );


        year.textContent =
            movie.year;


        meta.appendChild(
            year
        );

    }


    if (movie.rating) {

        const rating =
            document.createElement(
                "span"
            );


        rating.textContent =
            `★ ${movie.rating.toFixed(1)}`;


        meta.appendChild(
            rating
        );

    }


    info.appendChild(
        title
    );


    info.appendChild(
        meta
    );


    card.appendChild(
        poster
    );


    card.appendChild(
        info
    );


    card.addEventListener(
        "click",
        () => openMovie(
            movie
        )
    );


    return card;

}


// ============================================
// OPEN TRAILER
// ============================================

function openMovie(movie) {

    /*
     * Cinemeta may provide the YouTube trailer
     * directly.
     */

    if (
        movie.trailers &&
        movie.trailers.length
    ) {

        const trailer =
            movie.trailers.find(
                item =>
                    item &&
                    item.source
            );


        if (
            trailer &&
            trailer.source
        ) {

            const youtubeURL =
                `https://www.youtube.com/watch?v=${trailer.source}`;


            window.open(
                youtubeURL,
                "_blank",
                "noopener,noreferrer"
            );


            return;

        }

    }


    /*
     * Fallback:
     * Search YouTube.
     */

    const query =
        `${movie.title} official trailer`;


    const youtubeURL =
        `https://www.youtube.com/results?search_query=` +
        encodeURIComponent(
            query
        );


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

    const input =
        $("searchInput");


    const clear =
        $("clearSearch");


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        () => {

            const query =
                input.value
                    .trim()
                    .toLowerCase();


            if (clear) {

                clear.style.display =
                    query
                        ? "block"
                        : "none";

            }


            if (!query) {

                hideSearchResults();

                return;

            }


            searchMovies(
                query
            );

        }
    );


    if (clear) {

        clear.addEventListener(
            "click",
            () => {

                input.value = "";

                clear.style.display =
                    "none";

                hideSearchResults();

            }
        );

    }

}


// ============================================
// SEARCH
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
        allMovies.filter(
            movie => {

                const title =
                    String(
                        movie.title
                    ).toLowerCase();


                return title.includes(
                    query
                );

            }
        );


    /*
     * Search results may contain movies
     * whose metadata has not been loaded yet.
     */

    const loadedIDs =
        new Set(
            loadedMovies.map(
                movie => movie.id
            )
        );


    const unloaded =
        results.filter(
            movie =>
                !loadedIDs.has(
                    movie.id
                )
        );


    if (unloaded.length) {

        loadBatch(
            unloaded.slice(
                0,
                24
            )
        ).then(
            newMovies => {

                loadedMovies.push(
                    ...newMovies
                );

                searchMovies(
                    query
                );

            }
        );

    }


    section.style.display =
        "block";


    grid.innerHTML = "";


    if (count) {

        count.textContent =
            results.length;

    }


    const visible =
        loadedMovies.filter(
            movie =>
                String(
                    movie.title
                )
                    .toLowerCase()
                    .includes(
                        query
                    )
        );


    if (!visible.length) {

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


    visible
        .slice(
            0,
            60
        )
        .forEach(
            movie => {

                grid.appendChild(
                    createMovieCard(
                        movie
                    )
                );

            }
        );

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

    document
        .querySelectorAll(
            "[data-section]"
        )
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    event => {

                        const target =
                            link.getAttribute(
                                "data-section"
                            );


                        const section =
                            $(target);


                        if (!section) {
                            return;
                        }


                        event.preventDefault();


                        section.scrollIntoView({
                            behavior:
                                "smooth"
                        });

                    }
                );

            }
        );

}


// ============================================
// YEAR
// ============================================

function updateYear() {

    const element =
        $("currentYear");


    if (element) {

        element.textContent =
            new Date()
                .getFullYear();

    }

}


// ============================================
// LOADING
// ============================================

function showLoading(
    visible
) {

    const loading =
        $("loading");


    if (!loading) {
        return;
    }


    loading.style.display =
        visible
            ? "flex"
            : "none";

}


// ============================================
// ERROR
// ============================================

function showError(
    message
) {

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


// ============================================
// ESCAPE HTML
// ============================================

function escapeHTML(
    value
) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}
