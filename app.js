// ============================================================
// XYZMOVIEDAILY - MOVIE APP
// Cinemeta based - no TMDB API key required
// ============================================================

const API_BASE = "https://v3-cinemeta.strem.io";

const PAGE_SIZE = 100;
const PAGES_PER_CATALOG = 5;

const catalogs = [
  "top",
  "imdbRating",
  "year"
];

let allMovies = [];
let visibleMovies = [];

let currentPage = 1;
let isLoading = false;

// ============================================================
// DOM HELPERS
// ============================================================

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = $(id);
  if (element) {
    element.textContent = value;
  }
}

// ============================================================
// FALLBACK POSTER
// ============================================================

function fallbackPoster(title = "Movie") {
  return (
    "https://dummyimage.com/500x750/151515/ffffff.jpg" +
    "&text=" +
    encodeURIComponent(title)
  );
}

// ============================================================
// CLEAN TEXT
// ============================================================

function cleanText(value) {
  if (!value) return "";

  return String(value)
    .toLowerCase()
    .replace(/[_\-\/]+/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// NORMALIZE MOVIE
// ============================================================

function normalizeMovie(movie) {
  if (!movie) return null;

  const title =
    movie.name ||
    movie.title ||
    "Unknown Movie";

  const id =
    movie.id ||
    movie.imdb_id ||
    movie.imdbId;

  if (!id) return null;

  const genres = Array.isArray(movie.genres)
    ? movie.genres
    : [];

  const genreText = genres.join(" ");

  const description =
    movie.description ||
    movie.overview ||
    "";

  const year =
    movie.year ||
    movie.releaseInfo ||
    "";

  const rating =
    movie.imdbRating ||
    movie.rating ||
    movie.imdb_rating ||
    "";

  const poster =
    movie.poster ||
    movie.background ||
    "";

  const language =
    movie.language ||
    "";

  const country =
    movie.country ||
    "";

  const originalLanguage =
    movie.originalLanguage ||
    movie.original_language ||
    "";

  const director =
    Array.isArray(movie.director)
      ? movie.director.join(" ")
      : movie.director || "";

  const cast =
    Array.isArray(movie.cast)
      ? movie.cast.join(" ")
      : movie.cast || "";

  return {
    id,
    title,
    poster: poster || fallbackPoster(title),
    year: String(year),
    rating: rating ? Number(rating).toFixed(1) : "",
    description,
    genres,
    genreText,
    language,
    country,
    originalLanguage,
    director,
    cast,

    // Extra text used for classification
    searchText: cleanText(
      [
        title,
        description,
        genreText,
        language,
        country,
        originalLanguage,
        director,
        cast
      ].join(" ")
    )
  };
}

// ============================================================
// FETCH CATALOG
// ============================================================

async function fetchCatalog(catalog, skip = 0) {
  const url =
    `${API_BASE}/catalog/movie/${catalog}/skip=${skip}.json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Catalog request failed: ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data.metas)
    ? data.metas
    : [];
}

// ============================================================
// LOAD MOVIES
// ============================================================

async function loadMovies() {
  if (isLoading) return;

  isLoading = true;

  showLoading(true);
  hideError();

  try {
    const requests = [];

    for (const catalog of catalogs) {
      for (let page = 0; page < PAGES_PER_CATALOG; page++) {
        requests.push(
          fetchCatalog(
            catalog,
            page * PAGE_SIZE
          )
        );
      }
    }

    const results = await Promise.allSettled(requests);

    const collected = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        collected.push(...result.value);
      }
    }

    if (!collected.length) {
      throw new Error(
        "No movies were received from Cinemeta."
      );
    }

    // Normalize
    const normalized = collected
      .map(normalizeMovie)
      .filter(Boolean);

    // Remove duplicates
    const unique = new Map();

    for (const movie of normalized) {
      if (!unique.has(movie.id)) {
        unique.set(movie.id, movie);
      }
    }

    allMovies = Array.from(unique.values());

    console.log(
      "Movies loaded:",
      allMovies.length
    );

    // --------------------------------------------------------
    // ENRICH MOVIES WITH META INFORMATION
    // --------------------------------------------------------

    await enrichMovies();

    // --------------------------------------------------------
    // BUILD CATEGORIES
    // --------------------------------------------------------

    buildCategories();

    // --------------------------------------------------------
    // DISPLAY
    // --------------------------------------------------------

    renderAll();

    showLoading(false);

  } catch (error) {

    console.error(error);

    showLoading(false);

    showError(
      "Movies could not be loaded. Please try again."
    );

  } finally {
    isLoading = false;
  }
}

// ============================================================
// ENRICH MOVIES
// ============================================================

async function enrichMovies() {

  /*
    Cinemeta catalog data is sometimes incomplete.

    We request individual movie metadata to get:
    - genres
    - country
    - language
    - cast
    - director
  */

  const limit = Math.min(
    allMovies.length,
    500
  );

  const movies = allMovies.slice(0, limit);

  const batchSize = 10;

  for (
    let i = 0;
    i < movies.length;
    i += batchSize
  ) {

    const batch = movies.slice(
      i,
      i + batchSize
    );

    await Promise.all(
      batch.map(async movie => {

        try {

          const url =
            `${API_BASE}/meta/movie/${movie.id}.json`;

          const response = await fetch(url);

          if (!response.ok) return;

          const data = await response.json();

          const meta = data.meta;

          if (!meta) return;

          const updated = normalizeMovie({
            ...movie,
            ...meta
          });

          if (!updated) return;

          Object.assign(
            movie,
            updated
          );

        } catch (error) {
          console.warn(
            "Metadata failed:",
            movie.title
          );
        }

      })
    );
  }

  console.log(
    "Movie enrichment completed."
  );
}

// ============================================================
// CLASSIFICATION
// ============================================================

function classifyMovie(movie) {

  const text = movie.searchText || "";

  const title = cleanText(
    movie.title
  );

  const language = cleanText(
    movie.language
  );

  const originalLanguage = cleanText(
    movie.originalLanguage
  );

  const country = cleanText(
    movie.country
  );

  const genres = cleanText(
    movie.genreText
  );

  // ----------------------------------------------------------
  // LANGUAGE DETECTION
  // ----------------------------------------------------------

  const isTamil =
    containsAny(
      text,
      [
        "tamil",
        "tamilian",
        "tamil cinema"
      ]
    ) ||
    language === "ta" ||
    language.includes("tamil") ||
    originalLanguage === "ta" ||
    originalLanguage.includes("tamil");

  const isTelugu =
    containsAny(
      text,
      [
        "telugu",
        "telugu cinema"
      ]
    ) ||
    language === "te" ||
    language.includes("telugu") ||
    originalLanguage === "te" ||
    originalLanguage.includes("telugu");

  const isMalayalam =
    containsAny(
      text,
      [
        "malayalam",
        "malayalam cinema"
      ]
    ) ||
    language === "ml" ||
    language.includes("malayalam") ||
    originalLanguage === "ml" ||
    originalLanguage.includes("malayalam");

  const isKannada =
    containsAny(
      text,
      [
        "kannada",
        "kannada cinema"
      ]
    ) ||
    language === "kn" ||
    language.includes("kannada") ||
    originalLanguage === "kn" ||
    originalLanguage.includes("kannada");

  const isHindi =
    containsAny(
      text,
      [
        "hindi",
        "bollywood",
        "hindi cinema",
        "hindi film",
        "hindi movie"
      ]
    ) ||
    language === "hi" ||
    language.includes("hindi") ||
    originalLanguage === "hi" ||
    originalLanguage.includes("hindi");

  const isEnglish =
    containsAny(
      text,
      [
        "english"
      ]
    ) ||
    language === "en" ||
    language.includes("english") ||
    originalLanguage === "en";

  // ----------------------------------------------------------
  // INDIA DETECTION
  // ----------------------------------------------------------

  const isIndia =
    containsAny(
      text,
      [
        "india",
        "indian",
        "bollywood",
        "tamil",
        "telugu",
        "malayalam",
        "kannada",
        "hindi",
        "marathi",
        "bengali",
        "punjabi",
        "gujarati",
        "assamese",
        "odia"
      ]
    ) ||
    country.includes("india");

  // ----------------------------------------------------------
  // SOUTH INDIA
  // ----------------------------------------------------------

  const isSouth =
    isTamil ||
    isTelugu ||
    isMalayalam ||
    isKannada;

  // ----------------------------------------------------------
  // BOLLYWOOD
  // ----------------------------------------------------------

  const isBollywood =
    isHindi &&
    isIndia;

  // ----------------------------------------------------------
  // HOLLYWOOD
  // ----------------------------------------------------------

  const isHollywood =
    isEnglish &&
    !isIndia;

  // ----------------------------------------------------------
  // HINDI AVAILABLE
  // ----------------------------------------------------------

  /*
    This is intentionally broader.

    If metadata says Hindi anywhere, the movie is placed
    in Hindi Available as well.
  */

  const isHindiAvailable =
    isHindi ||
    containsAny(
      text,
      [
        "dubbed in hindi",
        "hindi dubbed",
        "dubbed hindi",
        "available in hindi",
        "hindi version"
      ]
    );

  // ----------------------------------------------------------
  // GENRES
  // ----------------------------------------------------------

  const isAction =
    genres.includes("action");

  const isComedy =
    genres.includes("comedy");

  const isRomance =
    genres.includes("romance") ||
    genres.includes("romantic");

  const isThriller =
    genres.includes("thriller");

  const isHorror =
    genres.includes("horror");

  const isDrama =
    genres.includes("drama");

  const isSciFi =
    genres.includes("sci fi") ||
    genres.includes("science fiction");

  const isCrime =
    genres.includes("crime");

  const isFantasy =
    genres.includes("fantasy");

  const isAdventure =
    genres.includes("adventure");

  const isAnimation =
    genres.includes("animation");

  return {
    tamil: isTamil,
    telugu: isTelugu,
    malayalam: isMalayalam,
    kannada: isKannada,

    south: isSouth,

    hindi: isHindi,
    bollywood: isBollywood,
    hollywood: isHollywood,
    hindiAvailable: isHindiAvailable,

    action: isAction,
    comedy: isComedy,
    romance: isRomance,
    thriller: isThriller,
    horror: isHorror,
    drama: isDrama,
    sciFi: isSciFi,
    crime: isCrime,
    fantasy: isFantasy,
    adventure: isAdventure,
    animation: isAnimation
  };
}

// ============================================================
// TEXT MATCH HELPER
// ============================================================

function containsAny(
  text,
  words
) {
  return words.some(word =>
    text.includes(
      cleanText(word)
    )
  );
}

// ============================================================
// BUILD CATEGORIES
// ============================================================

function buildCategories() {

  const categories = {

    trending: [],
    bollywood: [],
    hollywood: [],
    south: [],

    tamil: [],
    telugu: [],
    malayalam: [],
    kannada: [],

    hindi: [],

    action: [],
    comedy: [],
    romance: [],
    thriller: [],
    horror: [],
    drama: [],
    sciFi: [],
    crime: [],
    fantasy: [],
    adventure: [],
    animation: []
  };

  for (const movie of allMovies) {

    const result =
      classifyMovie(movie);

    movie.categories = result;

    // --------------------------------------------------------
    // TRENDING
    // --------------------------------------------------------

    categories.trending.push(movie);

    // --------------------------------------------------------
    // REGIONAL
    // --------------------------------------------------------

    if (result.bollywood) {
      categories.bollywood.push(movie);
    }

    if (result.hollywood) {
      categories.hollywood.push(movie);
    }

    if (result.south) {
      categories.south.push(movie);
    }

    if (result.tamil) {
      categories.tamil.push(movie);
    }

    if (result.telugu) {
      categories.telugu.push(movie);
    }

    if (result.malayalam) {
      categories.malayalam.push(movie);
    }

    if (result.kannada) {
      categories.kannada.push(movie);
    }

    if (result.hindiAvailable) {
      categories.hindi.push(movie);
    }

    // --------------------------------------------------------
    // GENRES
    // --------------------------------------------------------

    if (result.action) {
      categories.action.push(movie);
    }

    if (result.comedy) {
      categories.comedy.push(movie);
    }

    if (result.romance) {
      categories.romance.push(movie);
    }

    if (result.thriller) {
      categories.thriller.push(movie);
    }

    if (result.horror) {
      categories.horror.push(movie);
    }

    if (result.drama) {
      categories.drama.push(movie);
    }

    if (result.sciFi) {
      categories.sciFi.push(movie);
    }

    if (result.crime) {
      categories.crime.push(movie);
    }

    if (result.fantasy) {
      categories.fantasy.push(movie);
    }

    if (result.adventure) {
      categories.adventure.push(movie);
    }

    if (result.animation) {
      categories.animation.push(movie);
    }
  }

  // Sort categories
  for (const key of Object.keys(categories)) {

    categories[key].sort(
      movieSort
    );
  }

  window.movieCategories =
    categories;

  console.log(
    "CATEGORY COUNTS:",
    Object.fromEntries(
      Object.entries(categories)
        .map(([key, value]) => [
          key,
          value.length
        ])
    )
  );
}

// ============================================================
// MOVIE SORT
// ============================================================

function movieSort(a, b) {

  const ratingA =
    Number(a.rating) || 0;

  const ratingB =
    Number(b.rating) || 0;

  if (ratingA !== ratingB) {
    return ratingB - ratingA;
  }

  const yearA =
    Number(a.year) || 0;

  const yearB =
    Number(b.year) || 0;

  return yearB - yearA;
}

// ============================================================
// RENDER ALL
// ============================================================

function renderAll() {

  const categories =
    window.movieCategories || {};

  renderMovieSection(
    "trendingGrid",
    "trendingCount",
    categories.trending || [],
    24
  );

  renderMovieSection(
    "bollywoodGrid",
    "bollywoodCount",
    categories.bollywood || [],
    24
  );

  renderMovieSection(
    "hollywoodGrid",
    "hollywoodCount",
    categories.hollywood || [],
    24
  );

  renderMovieSection(
    "southGrid",
    "southCount",
    categories.south || [],
    24
  );

  renderMovieSection(
    "tamilGrid",
    "tamilCount",
    categories.tamil || [],
    24
  );

  renderMovieSection(
    "teluguGrid",
    "teluguCount",
    categories.telugu || [],
    24
  );

  renderMovieSection(
    "malayalamGrid",
    "malayalamCount",
    categories.malayalam || [],
    24
  );

  renderMovieSection(
    "kannadaGrid",
    "kannadaCount",
    categories.kannada || [],
    24
  );

  renderMovieSection(
    "hindiGrid",
    "hindiCount",
    categories.hindi || [],
    24
  );

  renderMovieSection(
    "actionGrid",
    "actionCount",
    categories.action || [],
    18
  );

  renderMovieSection(
    "comedyGrid",
    "comedyCount",
    categories.comedy || [],
    18
  );

  renderMovieSection(
    "romanceGrid",
    "romanceCount",
    categories.romance || [],
    18
  );

  renderMovieSection(
    "thrillerGrid",
    "thrillerCount",
    categories.thriller || [],
    18
  );

  renderMovieSection(
    "horrorGrid",
    "horrorCount",
    categories.horror || [],
    18
  );

  renderMovieSection(
    "dramaGrid",
    "dramaCount",
    categories.drama || [],
    18
  );

  renderMovieSection(
    "sci-fiGrid",
    "sci-fiCount",
    categories.sciFi || [],
    18
  );

  renderMovieSection(
    "crimeGrid",
    "crimeCount",
    categories.crime || [],
    18
  );

  renderMovieSection(
    "fantasyGrid",
    "fantasyCount",
    categories.fantasy || [],
    18
  );

  renderMovieSection(
    "adventureGrid",
    "adventureCount",
    categories.adventure || [],
    18
  );

  renderMovieSection(
    "animationGrid",
    "animationCount",
    categories.animation || [],
    18
  );

  // Featured / top / new
  const featured =
    [...allMovies]
      .sort(movieSort)
      .slice(0, 24);

  const newMovies =
    [...allMovies]
      .sort((a, b) =>
        (Number(b.year) || 0) -
        (Number(a.year) || 0)
      )
      .slice(0, 24);

  renderMovieSection(
    "featuredGrid",
    "featuredCount",
    featured,
    24
  );

  renderMovieSection(
    "newGrid",
    "newCount",
    newMovies,
    24
  );

  renderAllMovies();

  setText(
    "currentYear",
    new Date().getFullYear()
  );
}

// ============================================================
// RENDER MOVIE SECTION
// ============================================================

function renderMovieSection(
  gridId,
  countId,
  movies,
  limit = 24
) {

  const grid = $(gridId);

  if (!grid) return;

  const selected =
    movies.slice(0, limit);

  setText(
    countId,
    `${movies.length} movies`
  );

  if (!selected.length) {

    grid.innerHTML = `
      <div class="empty-category">
        No movies found in this category yet.
      </div>
    `;

    return;
  }

  grid.innerHTML =
    selected
      .map(createMovieCard)
      .join("");
}

// ============================================================
// ALL MOVIES
// ============================================================

function renderAllMovies() {

  const grid =
    $("allGrid");

  if (!grid) return;

  visibleMovies =
    allMovies.slice(
      0,
      currentPage * 100
    );

  setText(
    "allCount",
    `${allMovies.length} movies`
  );

  grid.innerHTML =
    visibleMovies
      .map(createMovieCard)
      .join("");

  const loadMore =
    $("loadMoreContainer");

  if (loadMore) {

    loadMore.style.display =
      visibleMovies.length <
      allMovies.length
        ? "flex"
        : "none";
  }
}

// ============================================================
// MOVIE CARD
// ============================================================

function createMovieCard(movie) {

  const poster =
    movie.poster ||
    fallbackPoster(movie.title);

  const rating =
    movie.rating
      ? `⭐ ${movie.rating}`
      : "⭐ N/A";

  const year =
    movie.year || "—";

  const safeTitle =
    escapeHTML(movie.title);

  return `
    <article
      class="movie-card"
      tabindex="0"
      onclick="openTrailerFromCard('${escapeJS(movie.title)}', '${escapeJS(movie.year)}')"
      onkeydown="handleMovieKeydown(event, '${escapeJS(movie.title)}', '${escapeJS(movie.year)}')"
    >

      <div class="movie-poster-wrap">

        <img
          class="movie-poster"
          src="${poster}"
          alt="${safeTitle}"
          loading="lazy"
          onerror="this.onerror=null;this.src='${fallbackPoster(movie.title)}'"
        >

        <div class="movie-play">
          ▶
        </div>

        <div class="movie-rating">
          ${rating}
        </div>

      </div>

      <div class="movie-info">

        <h3>
          ${safeTitle}
        </h3>

        <div class="movie-meta">
          ${year}
        </div>

      </div>

    </article>
  `;
}

// ============================================================
// YOUTUBE TRAILER
// ============================================================

function openTrailerFromCard(
  title,
  year
) {

  const query =
    `${title} ${year || ""} official trailer`;

  const url =
    "https://www.youtube.com/results?search_query=" +
    encodeURIComponent(query);

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}

// ============================================================
// KEYBOARD
// ============================================================

function handleMovieKeydown(
  event,
  title,
  year
) {

  if (
    event.key === "Enter" ||
    event.key === " "
  ) {

    event.preventDefault();

    openTrailerFromCard(
      title,
      year
    );
  }
}

// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
// ESCAPE JS
// ============================================================

function escapeJS(value) {

  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

// ============================================================
// SEARCH
// ============================================================

function searchMovies(query) {

  const search =
    cleanText(query);

  const section =
    $("searchResultsSection");

  const grid =
    $("searchResultsGrid");

  const noResults =
    $("noResults");

  if (!section || !grid) return;

  if (!search) {

    section.style.display =
      "none";

    return;
  }

  section.style.display =
    "block";

  const results =
    allMovies.filter(movie =>
      movie.searchText.includes(search)
    );

  setText(
    "searchCount",
    `${results.length} movies found`
  );

  if (!results.length) {

    grid.innerHTML = "";

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

  grid.innerHTML =
    results
      .slice(0, 100)
      .map(createMovieCard)
      .join("");
}

// ============================================================
// SEARCH EVENTS
// ============================================================

function setupSearch() {

  const input =
    $("searchInput");

  const clear =
    $("clearSearch");

  if (input) {

    input.addEventListener(
      "input",
      event => {

        searchMovies(
          event.target.value
        );

      }
    );
  }

  if (clear) {

    clear.addEventListener(
      "click",
      () => {

        if (input) {
          input.value = "";
        }

        searchMovies("");

      }
    );
  }
}

// ============================================================
// LOAD MORE
// ============================================================

function loadMoreMovies() {

  currentPage++;

  renderAllMovies();
}

// ============================================================
// CATEGORY NAVIGATION
// ============================================================

function showCategory(category) {

  const map = {

    trending:
      "trendingSection",

    bollywood:
      "bollywoodSection",

    hollywood:
      "hollywoodSection",

    south:
      "southSection",

    tamil:
      "tamilSection",

    telugu:
      "teluguSection",

    malayalam:
      "malayalamSection",

    kannada:
      "kannadaSection",

    hindi:
      "hindiSection",

    genres:
      "genresSection",

    action:
      "actionGenre",

    comedy:
      "comedyGenre",

    romance:
      "romanceGenre",

    thriller:
      "thrillerGenre",

    horror:
      "horrorGenre",

    drama:
      "dramaGenre",

    sciFi:
      "sci-fiGenre",

    crime:
      "crimeGenre",

    fantasy:
      "fantasyGenre",

    adventure:
      "adventureGenre",

    animation:
      "animationGenre"
  };

  const target =
    $(map[category]);

  if (target) {

    target.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }
}

// ============================================================
// LOADING
// ============================================================

function showLoading(show) {

  const element =
    $("loading");

  if (!element) return;

  element.style.display =
    show ? "flex" : "none";
}

// ============================================================
// ERROR
// ============================================================

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

// ============================================================
// RETRY
// ============================================================

function setupRetry() {

  const button =
    $("retryButton");

  if (!button) return;

  button.addEventListener(
    "click",
    () => {

      loadMovies();

    }
  );
}

// ============================================================
// LOAD MORE BUTTON
// ============================================================

function setupLoadMore() {

  const button =
    $("loadMoreButton");

  if (!button) return;

  button.addEventListener(
    "click",
    loadMoreMovies
  );
}

// ============================================================
// DEBUG CATEGORY
// ============================================================

function debugCategories() {

  if (!window.movieCategories) {
    return;
  }

  console.log(
    "========== XYZMOVIEDAILY =========="
  );

  for (
    const [name, movies]
    of Object.entries(
      window.movieCategories
    )
  ) {

    console.log(
      `${name}: ${movies.length}`
    );
  }

  console.log(
    "==================================="
  );
}

// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupSearch();

    setupRetry();

    setupLoadMore();

    loadMovies()
      .then(() => {

        debugCategories();

      });

  }
);

// ============================================================
// GLOBAL FUNCTIONS
// ============================================================

window.openTrailerFromCard =
  openTrailerFromCard;

window.handleMovieKeydown =
  handleMovieKeydown;

window.showCategory =
  showCategory;

window.loadMoreMovies =
  loadMoreMovies;
