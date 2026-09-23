/* =========================================================
   XYZMOVIEDAILY
   Movie API + Trending Movies + YouTube Trailers
   ========================================================= */


/* =========================================================
   1. API KEYS
   =========================================================

   PUT YOUR KEYS HERE.

   TMDB:
   https://www.themoviedb.org/

   YouTube:
   https://console.cloud.google.com/

   ========================================================= */

const TMDB_API_KEY = "PASTE_YOUR_TMDB_API_KEY_HERE";

const YOUTUBE_API_KEY = "PASTE_YOUR_YOUTUBE_API_KEY_HERE";


/* =========================================================
   2. SETTINGS
   ========================================================= */

const TMDB_LANGUAGE = "en-US";

const REGION = "IN";

const IMAGE_BASE_URL =
    "https://image.tmdb.org/t/p/w500";


/*
   We can load up to 1000 movie results.

   TMDB pages contain movie results.
   The website loads them page by page instead of
   downloading 1000 posters at once.
*/

const MAX_PAGES = 50;


/* =========================================================
   3. DOM ELEMENTS
   ========================================================= */

const movieGrid =
    document.getElementById("movieGrid");

const statusElement =
    document.getElementById("status");

const loadMoreButton =
    document.getElementById("loadMoreButton");

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const refreshButton =
    document.getElementById("refreshTrending");

const currentYear =
    document.getElementById("currentYear");


/* =========================================================
   4. STATE
   ========================================================= */

let currentPage = 1;

let totalPages = 1;

let currentMode = "trending";

let currentSearch = "";

let loadedMovieIds = new Set();

let isLoading = false;


/* =========================================================
   5. YEAR
   ========================================================= */

currentYear.textContent =
    new Date().getFullYear();


/* =========================================================
   6. CHECK API KEYS
   ========================================================= */

function hasTMDBKey() {

    return (
        TMDB_API_KEY &&
        !TMDB_API_KEY.includes(
            "PASTE_YOUR"
        )
    );

}


function hasYouTubeKey() {

    return (
        YOUTUBE_API_KEY &&
        !YOUTUBE_API_KEY.includes(
            "PASTE_YOUR"
        )
    );

}


/* =========================================================
   7. API ERROR
   ========================================================= */

function showAPIError(message) {

    statusElement.innerHTML = `
        <strong>Setup required</strong><br>
        ${message}
    `;

    loadMoreButton.disabled = true;

}


/* =========================================================
   8. TMDB REQUEST
   ========================================================= */

async function tmdbRequest(endpoint) {

    if (!hasTMDBKey()) {

        throw new Error(
            "Add your TMDB API key inside app.js."
        );

    }


    const separator =
        endpoint.includes("?")
            ? "&"
            : "?";


    const url =
        `https://api.themoviedb.org/3/${endpoint}` +
        `${separator}language=${TMDB_LANGUAGE}` +
        `&region=${REGION}`;


    const response =
        await fetch(
            url,
            {
                headers: {
                    Authorization:
                        `Bearer ${TMDB_API_KEY}`,

                    accept:
                        "application/json"
                }
            }
        );


    if (!response.ok) {

        let errorMessage =
            `TMDB request failed (${response.status}).`;

        try {

            const errorData =
                await response.json();

            if (errorData.status_message) {

                errorMessage =
                    errorData.status_message;

            }

        } catch (error) {
            // Ignore JSON parsing error.
        }

        throw new Error(
            errorMessage
        );

    }


    return response.json();

}


/* =========================================================
   9. CREATE IMAGE URL
   ========================================================= */

function getPosterURL(posterPath) {

    if (!posterPath) {

        return createFallbackPoster();

    }

    return (
        IMAGE_BASE_URL +
        posterPath
    );

}


/* =========================================================
   10. FALLBACK POSTER
   ========================================================= */

function createFallbackPoster() {

    return `
        data:image/svg+xml;charset=UTF-8,
        ${encodeURIComponent(`
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="500"
                height="750"
                viewBox="0 0 500 750"
            >
                <rect
                    width="500"
                    height="750"
                    fill="#171717"
                />

                <text
                    x="250"
                    y="350"
                    fill="#777"
                    text-anchor="middle"
                    font-family="Arial"
                    font-size="28"
                >
                    NO POSTER
                </text>
            </svg>
        `)}
    `;

}


/* =========================================================
   11. FORMAT DATE
   ========================================================= */

function getYear(date) {

    if (!date) {

        return "N/A";

    }

    return date.substring(
        0,
        4
    );

}


/* =========================================================
   12. ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    if (!value) {

        return "";

    }


    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   13. CREATE MOVIE CARD
   ========================================================= */

function createMovieCard(movie) {

    const title =
        escapeHTML(
            movie.title ||
            movie.name ||
            "Unknown Movie"
        );


    const year =
        getYear(
            movie.release_date
        );


    const rating =
        movie.vote_average
            ? Number(
                movie.vote_average
            ).toFixed(1)
            : "N/A";


    const poster =
        getPosterURL(
            movie.poster_path
        );


    const card =
        document.createElement("article");


    card.className =
        "movie-card";


    card.dataset.movieId =
        movie.id;


    card.innerHTML = `

        <div class="poster-wrapper">

            <img
                src="${poster}"
                alt="${title} poster"
                loading="lazy"
                onerror="this.src='${createFallbackPoster()}'"
            >

            <div class="play-overlay">

                <div class="play-circle">
                    ▶
                </div>

            </div>

        </div>


        <div class="movie-info">

            <h3 class="movie-title">
                ${title}
            </h3>

            <div class="movie-meta">

                <span>
                    ${year}
                </span>

                <span class="movie-rating">
                    ★ ${rating}
                </span>

            </div>

        </div>

    `;


    card.addEventListener(
        "click",
        () => openOfficialTrailer(movie)
    );


    return card;

}


/* =========================================================
   14. RENDER MOVIES
   ========================================================= */

function renderMovies(movies) {

    if (!movies || !movies.length) {

        statusElement.textContent =
            "No movies found.";

        return;

    }


    let added =
        0;


    movies.forEach(
        movie => {

            /*
               Avoid duplicates.
            */

            if (
                loadedMovieIds.has(
                    movie.id
                )
            ) {

                return;

            }


            /*
               Some TMDB results don't have posters.
            */

            if (!movie.id) {

                return;

            }


            loadedMovieIds.add(
                movie.id
            );


            const card =
                createMovieCard(
                    movie
                );


            movieGrid.appendChild(
                card
            );


            added++;

        }
    );


    statusElement.textContent =
        `${loadedMovieIds.size} movies available`;

}


/* =========================================================
   15. LOAD TRENDING MOVIES
   ========================================================= */

async function loadTrendingMovies(
    page = 1,
    append = false
) {

    if (isLoading) {

        return;

    }


    isLoading = true;


    if (!append) {

        movieGrid.innerHTML = "";

        loadedMovieIds.clear();

    }


    statusElement.textContent =
        "Loading trending movies...";


    loadMoreButton.disabled =
        true;


    try {

        /*
           TMDB trending movies API.
           We use the weekly list.
        */

        const data =
            await tmdbRequest(
                `trending/movie/week?page=${page}`
            );


        currentMode =
            "trending";


        currentPage =
            page;


        totalPages =
            Math.min(
                data.total_pages || 1,
                MAX_PAGES
            );


        renderMovies(
            data.results
        );


        updateLoadMoreButton();


    } catch (error) {

        console.error(
            error
        );


        statusElement.innerHTML = `
            <strong>Could not load movies.</strong><br>
            ${escapeHTML(error.message)}
        `;

    }


    isLoading = false;

}


/* =========================================================
   16. LOAD POPULAR / DISCOVER MOVIES
   ========================================================= */

async function loadDiscoverMovies(
    page = 1,
    append = false
) {

    if (isLoading) {

        return;

    }


    isLoading = true;


    if (!append) {

        movieGrid.innerHTML = "";

        loadedMovieIds.clear();

    }


    statusElement.textContent =
        "Loading movies...";


    loadMoreButton.disabled =
        true;


    try {

        const data =
            await tmdbRequest(
                `discover/movie` +
                `?include_adult=false` +
                `&include_video=false` +
                `&sort_by=popularity.desc` +
                `&page=${page}`
            );


        currentMode =
            "discover";


        currentPage =
            page;


        totalPages =
            Math.min(
                data.total_pages || 1,
                MAX_PAGES
            );


        renderMovies(
            data.results
        );


        updateLoadMoreButton();


    } catch (error) {

        console.error(
            error
        );


        statusElement.innerHTML = `
            <strong>Could not load movies.</strong><br>
            ${escapeHTML(error.message)}
        `;

    }


    isLoading = false;

}


/* =========================================================
   17. SEARCH MOVIES
   ========================================================= */

async function searchMovies(
    query,
    page = 1,
    append = false
) {

    if (!query.trim()) {

        loadTrendingMovies(
            1,
            false
        );

        return;

    }


    if (isLoading) {

        return;

    }


    isLoading = true;


    if (!append) {

        movieGrid.innerHTML = "";

        loadedMovieIds.clear();

    }


    statusElement.textContent =
        `Searching for "${query}"...`;


    loadMoreButton.disabled =
        true;


    try {

        const encodedQuery =
            encodeURIComponent(
                query.trim()
            );


        const data =
            await tmdbRequest(
                `search/movie` +
                `?query=${encodedQuery}` +
                `&include_adult=false` +
                `&page=${page}`
            );


        currentMode =
            "search";


        currentSearch =
            query.trim();


        currentPage =
            page;


        totalPages =
            Math.min(
                data.total_pages || 1,
                MAX_PAGES
            );


        renderMovies(
            data.results
        );


        updateLoadMoreButton();


        if (
            !data.results ||
            data.results.length === 0
        ) {

            statusElement.textContent =
                `No movies found for "${query}".`;

        }

    } catch (error) {

        console.error(
            error
        );


        statusElement.innerHTML = `
            <strong>Search failed.</strong><br>
            ${escapeHTML(error.message)}
        `;

    }


    isLoading = false;

}


/* =========================================================
   18. LOAD MORE
   ========================================================= */

function loadMoreMovies() {

    const nextPage =
        currentPage + 1;


    if (
        nextPage >
        totalPages
    ) {

        return;

    }


    if (
        currentMode ===
        "trending"
    ) {

        loadTrendingMovies(
            nextPage,
            true
        );


    } else if (
        currentMode ===
        "discover"
    ) {

        loadDiscoverMovies(
            nextPage,
            true
        );


    } else if (
        currentMode ===
        "search"
    ) {

        searchMovies(
            currentSearch,
            nextPage,
            true
        );

    }

}


/* =========================================================
   19. UPDATE LOAD MORE BUTTON
   ========================================================= */

function updateLoadMoreButton() {

    if (
        currentPage >=
        totalPages
    ) {

        loadMoreButton.disabled =
            true;

        loadMoreButton.textContent =
            "No More Movies";

        return;

    }


    loadMoreButton.disabled =
        false;

    loadMoreButton.textContent =
        `Load More Movies (${loadedMovieIds.size})`;

}


/* =========================================================
   20. FIND OFFICIAL TRAILER
   =========================================================

   YouTube search is used to find the trailer.

   We ask for:

   - video results
   - movie title
   - official trailer
   - trailer
   - region IN

   YouTube returns video IDs.
   We then open the selected video on YouTube.

   ========================================================= */

async function findYouTubeTrailer(
    movieTitle,
    movieYear
) {

    if (!hasYouTubeKey()) {

        /*
           If the YouTube API key hasn't been configured,
           open a YouTube search instead.

           This still works, but the API version is preferred.
        */

        const query =
            encodeURIComponent(
                `${movieTitle} ${movieYear} official trailer`
            );


        return (
            `https://www.youtube.com/results?search_query=${query}`
        );

    }


    const query =
        `${movieTitle} ${movieYear} official trailer`;


    const params =
        new URLSearchParams({

            part: "snippet",

            q: query,

            type: "video",

            maxResults: "10",

            order: "relevance",

            regionCode: "IN",

            relevanceLanguage: "en",

            safeSearch: "moderate",

            videoEmbeddable: "true"

        });


    const url =
        `https://www.googleapis.com/youtube/v3/search?${params.toString()}` +
        `&key=${encodeURIComponent(YOUTUBE_API_KEY)}`;


    const response =
        await fetch(
            url
        );


    if (!response.ok) {

        throw new Error(
            "YouTube search failed."
        );

    }


    const data =
        await response.json();


    if (
        !data.items ||
        !data.items.length
    ) {

        return null;

    }


    /*
       Try to find a result whose title contains
       "official" and "trailer".
    */

    const normalizedTitle =
        movieTitle.toLowerCase();


    const bestMatch =
        data.items.find(
            item => {

                const title =
                    (
                        item.snippet?.title ||
                        ""
                    ).toLowerCase();


                return (
                    title.includes("official") &&
                    title.includes("trailer") &&
                    (
                        title.includes(
                            normalizedTitle
                        ) ||
                        normalizedTitle
                            .split(" ")
                            .some(
                                word =>
                                    word.length > 3 &&
                                    title.includes(
                                        word
                                    )
                            )
                    )
                );

            }
        ) ||
        data.items[0];


    const videoId =
        bestMatch?.id?.videoId;


    if (!videoId) {

        return null;

    }


    return (
        `https://www.youtube.com/watch?v=${videoId}`
    );

}


/* =========================================================
   21. OPEN TRAILER
   ========================================================= */

async function openOfficialTrailer(
    movie
) {

    const movieTitle =
        movie.title ||
        movie.name ||
        "Movie";


    const movieYear =
        getYear(
            movie.release_date
        );


    /*
       Show a temporary status.
    */

    statusElement.textContent =
        `Finding trailer for ${movieTitle}...`;


    try {

        const trailerURL =
            await findYouTubeTrailer(
                movieTitle,
                movieYear
            );


        if (trailerURL) {

            /*
               Open in the same tab.
               Change to window.open(...) if you prefer
               a new tab.
            */

            window.location.href =
                trailerURL;

            return;

        }


        /*
           Fallback search.
        */

        const query =
            encodeURIComponent(
                `${movieTitle} ${movieYear} official trailer`
            );


        window.location.href =
            `https://www.youtube.com/results?search_query=${query}`;


    } catch (error) {

        console.error(
            error
        );


        /*
           Safe fallback if API fails.
        */

        const query =
            encodeURIComponent(
                `${movieTitle} ${movieYear} official trailer`
            );


        window.location.href =
            `https://www.youtube.com/results?search_query=${query}`;

    }

}


/* =========================================================
   22. SEARCH BUTTON
   ========================================================= */

searchButton.addEventListener(
    "click",
    () => {

        const query =
            searchInput.value.trim();


        if (!query) {

            loadTrendingMovies(
                1,
                false
            );

            return;

        }


        searchMovies(
            query,
            1,
            false
        );

    }
);


/* =========================================================
   23. ENTER KEY SEARCH
   ========================================================= */

searchInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Enter"
        ) {

            searchButton.click();

        }

    }
);


/* =========================================================
   24. REFRESH TRENDING
   ========================================================= */

refreshButton.addEventListener(
    "click",
    () => {

        searchInput.value = "";

        currentSearch = "";

        loadTrendingMovies(
            1,
            false
        );

        window.location.hash =
            "trending";

    }
);


/* =========================================================
   25. LOAD MORE BUTTON
   ========================================================= */

loadMoreButton.addEventListener(
    "click",
    loadMoreMovies
);


/* =========================================================
   26. INITIALIZE WEBSITE
   ========================================================= */

function initializeWebsite() {

    if (!hasTMDBKey()) {

        showAPIError(
            "Open app.js and replace " +
            "PASTE_YOUR_TMDB_API_KEY_HERE " +
            "with your TMDB API key."
        );

        return;

    }


    /*
       Trending movies appear automatically
       when the website opens.
    */

    loadTrendingMovies(
        1,
        false
    );

}


/* =========================================================
   START
   ========================================================= */

initializeWebsite();
