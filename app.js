const TMDB_READ_ACCESS_TOKEN = "PASTE_YOUR_TMDB_READ_ACCESS_TOKEN_HERE";

const API_URL = "https://api.themoviedb.org/3";
const IMAGE_URL = "https://image.tmdb.org/t/p/w500";

let page = 1;
let loading = false;
let totalPages = 1;

const movieGrid = document.getElementById("movieGrid");
const statusElement = document.getElementById("status");
const loadMoreButton = document.getElementById("loadMoreButton");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const refreshButton = document.getElementById("refreshTrending");
const currentYear = document.getElementById("currentYear");

currentYear.textContent = new Date().getFullYear();


function checkToken() {
    if (
        !TMDB_READ_ACCESS_TOKEN ||
        TMDB_READ_ACCESS_TOKEN.includes("PASTE_YOUR")
    ) {
        statusElement.innerHTML =
            "Please add your TMDB API Read Access Token in app.js.";

        return false;
    }

    return true;
}


async function tmdb(endpoint) {

    const response = await fetch(
        `${API_URL}${endpoint}`,
        {
            method: "GET",

            headers: {
                Authorization:
                    `Bearer ${TMDB_READ_ACCESS_TOKEN}`,

                accept:
                    "application/json"
            }
        }
    );


    if (!response.ok) {

        const text =
            await response.text();

        console.error(
            "TMDB ERROR:",
            response.status,
            text
        );

        throw new Error(
            `TMDB error ${response.status}`
        );
    }


    return response.json();
}


function posterURL(path) {

    if (!path) {
        return "https://placehold.co/500x750/151515/ffffff?text=No+Poster";
    }

    return `${IMAGE_URL}${path}`;
}


function escapeHTML(text) {

    return String(text || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function movieYear(date) {

    if (!date) {
        return "N/A";
    }

    return date.substring(0, 4);
}


function createCard(movie) {

    const title =
        escapeHTML(movie.title);

    const year =
        movieYear(movie.release_date);

    const rating =
        movie.vote_average
            ? Number(movie.vote_average).toFixed(1)
            : "N/A";

    const poster =
        posterURL(movie.poster_path);


    const card =
        document.createElement("article");

    card.className =
        "movie-card";


    card.innerHTML = `
        <div class="poster-wrapper">

            <img
                src="${poster}"
                alt="${title}"
                loading="lazy"
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


    const image =
        card.querySelector("img");


    image.addEventListener(
        "error",
        () => {

            image.src =
                "https://placehold.co/500x750/151515/ffffff?text=Poster+Unavailable";

        }
    );


    card.addEventListener(
        "click",
        () => {

            openTrailer(movie);

        }
    );


    return card;
}


function addMovies(movies) {

    movies.forEach(
        movie => {

            if (!movie.id) {
                return;
            }

            const card =
                createCard(movie);

            movieGrid.appendChild(card);

        }
    );


    statusElement.textContent =
        `${movieGrid.children.length} movies loaded`;
}


async function loadTrending() {

    if (!checkToken()) {
        return;
    }


    if (loading) {
        return;
    }


    loading = true;

    statusElement.textContent =
        "Loading trending movies...";


    try {

        const data =
            await tmdb(
                `/trending/movie/week?page=${page}`
            );


        console.log(
            "TMDB RESPONSE:",
            data
        );


        if (
            !data.results ||
            data.results.length === 0
        ) {

            statusElement.textContent =
                "TMDB returned no movies.";

            return;
        }


        totalPages =
            Math.min(
                data.total_pages || 1,
                50
            );


        addMovies(
            data.results
        );


        if (
            page >= totalPages
        ) {

            loadMoreButton.disabled =
                true;

            loadMoreButton.textContent =
                "No More Movies";

        } else {

            loadMoreButton.disabled =
                false;

            loadMoreButton.textContent =
                "Load More Movies";

        }

    } catch (error) {

        console.error(error);

        statusElement.innerHTML =
            `<strong>Movie loading failed.</strong><br>
             Open the browser Console with F12 to see the error.`;

    }


    loading = false;
}


async function searchMovies() {

    if (!checkToken()) {
        return;
    }


    const query =
        searchInput.value.trim();


    if (!query) {

        movieGrid.innerHTML = "";

        page = 1;

        loadTrending();

        return;
    }


    movieGrid.innerHTML = "";

    statusElement.textContent =
        `Searching for "${query}"...`;


    try {

        const encoded =
            encodeURIComponent(query);


        const data =
            await tmdb(
                `/search/movie?query=${encoded}&page=1`
            );


        if (
            !data.results ||
            data.results.length === 0
        ) {

            statusElement.textContent =
                "No movies found.";

            return;
        }


        totalPages =
            Math.min(
                data.total_pages || 1,
                50
            );


        page = 1;


        addMovies(
            data.results
        );

    } catch (error) {

        console.error(error);

        statusElement.textContent =
            "Search failed.";

    }
}


async function loadMore() {

    if (loading) {
        return;
    }


    if (page >= totalPages) {
        return;
    }


    page++;


    await loadTrending();
}


async function openTrailer(movie) {

    const title =
        movie.title || "movie";


    const year =
        movieYear(movie.release_date);


    /*
       Direct YouTube search fallback.
       This does not require another API.
    */

    const query =
        encodeURIComponent(
            `${title} ${year} official trailer`
        );


    const youtubeURL =
        `https://www.youtube.com/results?search_query=${query}`;


    window.location.href =
        youtubeURL;
}


searchButton.addEventListener(
    "click",
    searchMovies
);


searchInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            searchMovies();

        }

    }
);


refreshButton.addEventListener(
    "click",
    () => {

        movieGrid.innerHTML = "";

        page = 1;

        searchInput.value = "";

        loadTrending();

    }
);


loadMoreButton.addEventListener(
    "click",
    loadMore
);


loadTrending();
