/* =====================================================
   XYZMOVIEDAILY
   NO TMDB API
===================================================== */


/* ================= CONFIG ================= */

const API_BASE =
    "https://v3-cinemeta.strem.io";


const CATALOG_URL =
    `${API_BASE}/catalog/movie/top.json`;


/* ================= ELEMENTS ================= */

const movieGrid =
    document.getElementById("movieGrid");

const searchInput =
    document.getElementById("searchInput");

const clearSearch =
    document.getElementById("clearSearch");

const loading =
    document.getElementById("loading");

const errorBox =
    document.getElementById("errorBox");

const errorText =
    document.getElementById("errorText");

const retryButton =
    document.getElementById("retryButton");

const noResults =
    document.getElementById("noResults");

const movieCount =
    document.getElementById("movieCount");

const currentYear =
    document.getElementById("currentYear");


/* ================= DATA ================= */

let movies = [];


/* ================= START ================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        currentYear.textContent =
            new Date().getFullYear();

        loadMovies();

    }
);


/* ================= LOAD MOVIES ================= */

async function loadMovies() {

    showLoading();

    hideError();

    hideNoResults();

    try {

        const response =
            await fetch(
                CATALOG_URL,
                {
                    method: "GET",

                    headers: {
                        "Accept": "application/json"
                    },

                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            !data ||
            !Array.isArray(data.metas)
        ) {

            throw new Error(
                "Invalid movie catalog."
            );

        }


        movies =
            cleanMovies(data.metas);


        if (movies.length === 0) {

            throw new Error(
                "No movies found."
            );

        }


        renderMovies(movies);


    } catch (error) {

        console.error(
            "XYZMOVIEDAILY error:",
            error
        );


        showError(
            "The movie catalog could not be loaded. " +
            "Please try again."
        );


    } finally {

        hideLoading();

    }

}


/* ================= CLEAN MOVIES ================= */

function cleanMovies(movieList) {

    const uniqueMovies =
        new Map();


    movieList.forEach(movie => {

        if (!movie) {
            return;
        }


        const title =
            movie.name ||
            movie.title ||
            "Unknown Movie";


        const id =
            movie.id ||
            title;


        if (!uniqueMovies.has(id)) {

            uniqueMovies.set(
                id,
                {
                    id: id,

                    title: title,

                    poster:
                        movie.poster ||
                        "",

                    background:
                        movie.background ||
                        "",

                    year:
                        movie.releaseInfo ||
                        movie.year ||
                        "",

                    imdbRating:
                        movie.imdbRating ||
                        "",

                    description:
                        movie.description ||
                        ""
                }
            );

        }

    });


    return Array.from(
        uniqueMovies.values()
    );

}


/* ================= RENDER MOVIES ================= */

function renderMovies(movieList) {

    movieGrid.innerHTML = "";


    if (!movieList.length) {

        showNoResults();

        updateCount(0);

        return;

    }


    hideNoResults();


    const fragment =
        document.createDocumentFragment();


    movieList.forEach(movie => {

        const card =
            createMovieCard(movie);


        fragment.appendChild(card);

    });


    movieGrid.appendChild(fragment);


    updateCount(
        movieList.length
    );

}


/* ================= CREATE CARD ================= */

function createMovieCard(movie) {

    const card =
        document.createElement("article");


    card.className =
        "movie-card";


    const title =
        movie.title ||
        "Unknown Movie";


    const poster =
        movie.poster ||
        createFallbackPoster(title);


    const year =
        movie.year ||
        "";


    card.innerHTML = `

        <div class="poster-wrapper">

            <img
                class="movie-poster"
                src="${escapeAttribute(poster)}"
                alt="${escapeAttribute(title)} poster"
                loading="lazy"
                referrerpolicy="no-referrer"
            >

            <div class="poster-overlay">

                <span class="watch-button">
                    ▶ Official Trailer
                </span>

            </div>

        </div>


        <div class="movie-info">

            <h3>
                ${escapeHTML(title)}
            </h3>

            <p>
                ${escapeHTML(year)}
            </p>

        </div>

    `;


    const image =
        card.querySelector(
            ".movie-poster"
        );


    image.addEventListener(
        "error",
        () => {

            image.src =
                createFallbackPoster(title);

        },
        {
            once: true
        }
    );


    card.addEventListener(
        "click",
        () => {

            openOfficialTrailerSearch(
                title,
                movie.year
            );

        }
    );


    return card;

}


/* ================= TRAILER ================= */

function openOfficialTrailerSearch(
    title,
    year
) {

    let searchText =
        `${title} official trailer`;


    if (year) {

        searchText +=
            ` ${year}`;

    }


    const youtubeURL =
        "https://www.youtube.com/results?search_query=" +
        encodeURIComponent(
            searchText
        );


    window.open(
        youtubeURL,
        "_blank",
        "noopener,noreferrer"
    );

}


/* ================= SEARCH ================= */

searchInput.addEventListener(
    "input",
    () => {

        const query =
            searchInput.value
                .trim()
                .toLowerCase();


        if (!query) {

            renderMovies(movies);

            return;

        }


        const results =
            movies.filter(
                movie => {

                    const title =
                        (
                            movie.title ||
                            ""
                        ).toLowerCase();


                    return title.includes(
                        query
                    );

                }
            );


        renderMovies(results);

    }
);


/* ================= CLEAR SEARCH ================= */

clearSearch.addEventListener(
    "click",
    () => {

        searchInput.value = "";

        renderMovies(movies);

        searchInput.focus();

    }
);


/* ================= RETRY ================= */

retryButton.addEventListener(
    "click",
    () => {

        loadMovies();

    }
);


/* ================= LOADING ================= */

function showLoading() {

    loading.style.display =
        "flex";

    movieGrid.innerHTML = "";

}


function hideLoading() {

    loading.style.display =
        "none";

}


/* ================= ERROR ================= */

function showError(message) {

    errorText.textContent =
        message;

    errorBox.style.display =
        "block";

}


function hideError() {

    errorBox.style.display =
        "none";

}


/* ================= NO RESULTS ================= */

function showNoResults() {

    noResults.style.display =
        "block";

}


function hideNoResults() {

    noResults.style.display =
        "none";

}


/* ================= COUNT ================= */

function updateCount(count) {

    movieCount.textContent =
        `${count} movies`;

}


/* ================= FALLBACK POSTER ================= */

function createFallbackPoster(title) {

    return (
        "https://dummyimage.com/500x750/111111/ffffff" +
        "?text=" +
        encodeURIComponent(title)
    );

}


/* ================= HTML SAFETY ================= */

function escapeHTML(value) {

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


function escapeAttribute(value) {

    return escapeHTML(value);

}
