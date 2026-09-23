const MOVIE_API =
  "https://v3-cinemeta.strem.io/catalog/movie/popular.json";

const grid = document.getElementById("movieGrid");
const searchInput = document.getElementById("searchInput");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("errorBox");

let movies = [];

/* =========================
   LOAD MOVIES
========================= */

async function loadMovies() {
    showLoading(true);
    hideError();

    try {
        const response = await fetch(MOVIE_API);

        if (!response.ok) {
            throw new Error("Movie catalog could not be loaded.");
        }

        const data = await response.json();

        movies = Array.isArray(data.metas) ? data.metas : [];

        if (movies.length === 0) {
            throw new Error("No movies were returned.");
        }

        displayMovies(movies);

    } catch (error) {
        console.error("Movie API error:", error);

        showError(
            "Movies could not be loaded right now. Please refresh the page."
        );
    } finally {
        showLoading(false);
    }
}

/* =========================
   DISPLAY MOVIES
========================= */

function displayMovies(movieList) {
    grid.innerHTML = "";

    movieList.forEach(movie => {
        const card = createMovieCard(movie);
        grid.appendChild(card);
    });
}

/* =========================
   MOVIE CARD
========================= */

function createMovieCard(movie) {
    const card = document.createElement("article");

    card.className = "movie-card";

    const title = movie.name || "Unknown Movie";
    const year = movie.releaseInfo || "";
    const poster = movie.poster || createFallbackPoster(title);

    card.innerHTML = `
        <div class="poster-wrapper">
            <img
                class="movie-poster"
                src="${poster}"
                alt="${escapeHTML(title)}"
                loading="lazy"
                onerror="this.src='${createFallbackPoster(title)}'"
            >

            <div class="poster-overlay">
                <span class="watch-button">
                    ▶ Watch Trailer
                </span>
            </div>
        </div>

        <div class="movie-info">
            <h3>${escapeHTML(title)}</h3>
            <p>${escapeHTML(year)}</p>
        </div>
    `;

    card.addEventListener("click", () => {
        openTrailer(title);
    });

    return card;
}

/* =========================
   OFFICIAL TRAILER SEARCH
========================= */

function openTrailer(title) {
    const searchText =
        `${title} official trailer`;

    const youtubeURL =
        "https://www.youtube.com/results?search_query=" +
        encodeURIComponent(searchText);

    window.open(youtubeURL, "_blank");
}

/* =========================
   SEARCH
========================= */

searchInput.addEventListener("input", function () {
    const query = this.value.toLowerCase().trim();

    if (!query) {
        displayMovies(movies);
        return;
    }

    const filteredMovies = movies.filter(movie => {
        const title = (movie.name || "").toLowerCase();

        return title.includes(query);
    });

    displayMovies(filteredMovies);
});

/* =========================
   FALLBACK POSTER
========================= */

function createFallbackPoster(title) {
    return (
        "https://dummyimage.com/500x750/111827/ffffff&text=" +
        encodeURIComponent(title)
    );
}

/* =========================
   HTML SAFETY
========================= */

function escapeHTML(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================
   LOADING
========================= */

function showLoading(show) {
    if (!loading) return;

    loading.style.display = show ? "block" : "none";
}

/* =========================
   ERROR
========================= */

function showError(message) {
    if (!errorBox) return;

    errorBox.textContent = message;
    errorBox.style.display = "block";
}

function hideError() {
    if (!errorBox) return;

    errorBox.style.display = "none";
}

/* =========================
   START WEBSITE
========================= */

loadMovies();
