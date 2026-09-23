// ============================================================
// XYZMOVIEDAILY
// LARGE INDIAN MOVIE COLLECTION
// ============================================================

const API_BASE = "https://v3-cinemeta.strem.io";

let allMovies = [];
let currentPage = 1;

const MOVIES_PER_LOAD = 100;

// ============================================================
// SEARCH TERMS
// ============================================================

const SEARCH_TERMS = [

  // Hindi / Bollywood
  "hindi",
  "bollywood",
  "hindi movie",
  "hindi film",
  "indian movie",
  "indian film",

  // Tamil
  "tamil",
  "tamil movie",
  "tamil film",
  "kollywood",

  // Telugu
  "telugu",
  "telugu movie",
  "telugu film",
  "tollywood",

  // Malayalam
  "malayalam",
  "malayalam movie",
  "malayalam film",
  "mollywood",

  // Kannada
  "kannada",
  "kannada movie",
  "kannada film",
  "sandalwood",

  // Indian cinema
  "india",
  "indian cinema",
  "indian film",
  "indian action",
  "indian comedy",
  "indian drama",
  "indian thriller",
  "indian romance",
  "indian horror",

  // Hindi popular genres
  "hindi action",
  "hindi comedy",
  "hindi drama",
  "hindi thriller",
  "hindi romance",
  "hindi horror",
  "hindi crime",

  // Tamil genres
  "tamil action",
  "tamil comedy",
  "tamil drama",
  "tamil thriller",
  "tamil romance",
  "tamil horror",

  // Telugu genres
  "telugu action",
  "telugu comedy",
  "telugu drama",
  "telugu thriller",
  "telugu romance",
  "telugu horror",

  // Malayalam genres
  "malayalam action",
  "malayalam comedy",
  "malayalam drama",
  "malayalam thriller",
  "malayalam romance",
  "malayalam horror",

  // Kannada genres
  "kannada action",
  "kannada comedy",
  "kannada drama",
  "kannada thriller",
  "kannada romance",
  "kannada horror"
];

// ============================================================
// DOM
// ============================================================

function $(id) {
  return document.getElementById(id);
}

// ============================================================
// FALLBACK POSTER
// ============================================================

function fallbackPoster(title) {

  return (
    "https://dummyimage.com/500x750/151515/ffffff.jpg" +
    "&text=" +
    encodeURIComponent(title || "Movie")
  );
}

// ============================================================
// CLEAN TEXT
// ============================================================

function cleanText(value) {

  return String(value || "")
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

  const id =
    movie.id ||
    movie.imdb_id ||
    movie.imdbId;

  const title =
    movie.name ||
    movie.title;

  if (!id || !title) {
    return null;
  }

  const genres =
    Array.isArray(movie.genres)
      ? movie.genres
      : [];

  const cast =
    Array.isArray(movie.cast)
      ? movie.cast.join(" ")
      : movie.cast || "";

  const director =
    Array.isArray(movie.director)
      ? movie.director.join(" ")
      : movie.director || "";

  const language =
    movie.language ||
    movie.originalLanguage ||
    movie.original_language ||
    "";

  const country =
    movie.country ||
    "";

  const year =
    movie.year ||
    movie.releaseInfo ||
    "";

  const rating =
    movie.imdbRating ||
    movie.rating ||
    "";

  const poster =
    movie.poster ||
    "";

  const description =
    movie.description ||
    movie.overview ||
    "";

  const genreText =
    genres.join(" ");

  const searchText =
    cleanText([
      title,
      description,
      genreText,
      language,
      country,
      cast,
      director
    ].join(" "));

  return {

    id,

    title,

    poster:
      poster ||
      fallbackPoster(title),

    year:
      String(year),

    rating:
      rating
        ? Number(rating).toFixed(1)
        : "",

    description,

    genres,

    genreText,

    language,

    country,

    originalLanguage:
      movie.originalLanguage ||
      movie.original_language ||
      "",

    cast,

    director,

    searchText
  };
}

// ============================================================
// FETCH SEARCH
// ============================================================

async function searchCinemeta(term) {

  const encoded =
    encodeURIComponent(term);

  const url =
    `${API_BASE}/catalog/movie/top/search=${encoded}.json`;

  try {

    const response =
      await fetch(url);

    if (!response.ok) {
      console.warn(
        "Search failed:",
        term,
        response.status
      );

      return [];
    }

    const data =
      await response.json();

    return Array.isArray(data.metas)
      ? data.metas
      : [];

  } catch (error) {

    console.warn(
      "Search error:",
      term,
      error
    );

    return [];
  }
}

// ============================================================
// PAGINATED CATALOG
// ============================================================

async function fetchCatalog(
  catalog,
  skip
) {

  const url =
    `${API_BASE}/catalog/movie/${catalog}/skip=${skip}.json`;

  try {

    const response =
      await fetch(url);

    if (!response.ok) {
      return [];
    }

    const data =
      await response.json();

    return Array.isArray(data.metas)
      ? data.metas
      : [];

  } catch {

    return [];
  }
}

// ============================================================
// LOAD BIG MOVIE DATABASE
// ============================================================

async function loadMovies() {

  showLoading(true);
  hideError();

  try {

    console.log(
      "Starting large movie collection..."
    );

    const results = [];

    // --------------------------------------------------------
    // 1. SEARCH INDIAN MOVIES
    // --------------------------------------------------------

    for (
      let i = 0;
      i < SEARCH_TERMS.length;
      i += 5
    ) {

      const batch =
        SEARCH_TERMS.slice(
          i,
          i + 5
        );

      console.log(
        "Searching:",
        batch
      );

      const batchResults =
        await Promise.all(
          batch.map(
            searchCinemeta
          )
        );

      for (
        const movies
        of batchResults
      ) {

        results.push(
          ...movies
        );
      }
    }

    // --------------------------------------------------------
    // 2. GET MANY CATALOG PAGES
    // --------------------------------------------------------

    const catalogRequests = [];

    const catalogs = [
      "top",
      "imdbRating",
      "year"
    ];

    for (
      const catalog
      of catalogs
    ) {

      for (
        let skip = 0;
        skip <= 2000;
        skip += 100
      ) {

        catalogRequests.push(
          fetchCatalog(
            catalog,
            skip
          )
        );

      }
    }

    const catalogResults =
      await Promise.all(
        catalogRequests
      );

    for (
      const movies
      of catalogResults
    ) {

      results.push(
        ...movies
      );

    }

    console.log(
      "Raw movie results:",
      results.length
    );

    // --------------------------------------------------------
    // 3. NORMALIZE
    // --------------------------------------------------------

    const normalized =
      results
        .map(normalizeMovie)
        .filter(Boolean);

    // --------------------------------------------------------
    // 4. REMOVE DUPLICATES
    // --------------------------------------------------------

    const movieMap =
      new Map();

    for (
      const movie
      of normalized
    ) {

      if (
        !movieMap.has(movie.id)
      ) {

        movieMap.set(
          movie.id,
          movie
        );

      }

    }

    allMovies =
      Array.from(
        movieMap.values()
      );

    console.log(
      "Unique movies:",
      allMovies.length
    );

    // --------------------------------------------------------
    // 5. ENRICH INDIAN MOVIES
    // --------------------------------------------------------

    await enrichIndianMovies();

    // --------------------------------------------------------
    // 6. CLASSIFY
    // --------------------------------------------------------

    classifyAllMovies();

    // --------------------------------------------------------
    // 7. RENDER
    // --------------------------------------------------------

    renderAll();

    printCategoryCounts();

    showLoading(false);

  } catch (error) {

    console.error(error);

    showLoading(false);

    showError(
      "Movie loading failed. Please refresh the page."
    );
  }
}

// ============================================================
// ENRICH MOVIES
// ============================================================

async function enrichIndianMovies() {

  console.log(
    "Loading detailed metadata..."
  );

  /*
    We don't request every movie at once.
    That would be too many requests for a browser.

    First 1000 movies are enriched in batches.
  */

  const limit =
    Math.min(
      allMovies.length,
      1000
    );

  const batchSize = 15;

  for (
    let start = 0;
    start < limit;
    start += batchSize
  ) {

    const batch =
      allMovies.slice(
        start,
        start + batchSize
      );

    await Promise.all(
      batch.map(
        async movie => {

          try {

            const response =
              await fetch(
                `${API_BASE}/meta/movie/${movie.id}.json`
              );

            if (!response.ok) {
              return;
            }

            const data =
              await response.json();

            if (!data.meta) {
              return;
            }

            const updated =
              normalizeMovie({
                ...movie,
                ...data.meta
              });

            if (updated) {

              Object.assign(
                movie,
                updated
              );

            }

          } catch {
            // Ignore individual metadata errors
          }

        }
      )
    );

    console.log(
      `Metadata: ${Math.min(
        start + batchSize,
        limit
      )}/${limit}`
    );
  }
}

// ============================================================
// CLASSIFICATION
// ============================================================

function classifyMovie(movie) {

  const text =
    movie.searchText || "";

  const title =
    cleanText(movie.title);

  const language =
    cleanText(
      movie.language
    );

  const originalLanguage =
    cleanText(
      movie.originalLanguage
    );

  const country =
    cleanText(
      movie.country
    );

  const genres =
    cleanText(
      movie.genreText
    );

  // ----------------------------------------------------------
  // TAMIL
  // ----------------------------------------------------------

  const tamil =
    language === "ta" ||
    originalLanguage === "ta" ||
    language.includes("tamil") ||
    originalLanguage.includes("tamil") ||
    text.includes("tamil");

  // ----------------------------------------------------------
  // TELUGU
  // ----------------------------------------------------------

  const telugu =
    language === "te" ||
    originalLanguage === "te" ||
    language.includes("telugu") ||
    originalLanguage.includes("telugu") ||
    text.includes("telugu");

  // ----------------------------------------------------------
  // MALAYALAM
  // ----------------------------------------------------------

  const malayalam =
    language === "ml" ||
    originalLanguage === "ml" ||
    language.includes("malayalam") ||
    originalLanguage.includes("malayalam") ||
    text.includes("malayalam");

  // ----------------------------------------------------------
  // KANNADA
  // ----------------------------------------------------------

  const kannada =
    language === "kn" ||
    originalLanguage === "kn" ||
    language.includes("kannada") ||
    originalLanguage.includes("kannada") ||
    text.includes("kannada");

  // ----------------------------------------------------------
  // HINDI
  // ----------------------------------------------------------

  const hindi =
    language === "hi" ||
    originalLanguage === "hi" ||
    language.includes("hindi") ||
    originalLanguage.includes("hindi") ||
    text.includes("hindi") ||
    text.includes("bollywood");

  // ----------------------------------------------------------
  // INDIA
  // ----------------------------------------------------------

  const india =
    country.includes("india") ||
    text.includes("india") ||
    text.includes("indian") ||
    tamil ||
    telugu ||
    malayalam ||
    kannada ||
    hindi;

  // ----------------------------------------------------------
  // SOUTH INDIA
  // ----------------------------------------------------------

  const south =
    tamil ||
    telugu ||
    malayalam ||
    kannada;

  // ----------------------------------------------------------
  // BOLLYWOOD
  // ----------------------------------------------------------

  const bollywood =
    hindi &&
    india;

  // ----------------------------------------------------------
  // HOLLYWOOD
  // ----------------------------------------------------------

  const english =
    language === "en" ||
    originalLanguage === "en" ||
    language.includes("english") ||
    originalLanguage.includes("english");

  const hollywood =
    english &&
    !india;

  // ----------------------------------------------------------
  // HINDI AVAILABLE
  // ----------------------------------------------------------

  const hindiAvailable =
    hindi ||
    text.includes("hindi dubbed") ||
    text.includes("dubbed in hindi") ||
    text.includes("hindi version");

  // ----------------------------------------------------------
  // GENRES
  // ----------------------------------------------------------

  const action =
    genres.includes("action");

  const comedy =
    genres.includes("comedy");

  const romance =
    genres.includes("romance") ||
    genres.includes("romantic");

  const thriller =
    genres.includes("thriller");

  const horror =
    genres.includes("horror");

  const drama =
    genres.includes("drama");

  const sciFi =
    genres.includes("sci fi") ||
    genres.includes("science fiction");

  const crime =
    genres.includes("crime");

  const fantasy =
    genres.includes("fantasy");

  const adventure =
    genres.includes("adventure");

  const animation =
    genres.includes("animation");

  return {

    bollywood,
    hollywood,

    south,

    tamil,
    telugu,
    malayalam,
    kannada,

    hindi,
    hindiAvailable,

    action,
    comedy,
    romance,
    thriller,
    horror,
    drama,
    sciFi,
    crime,
    fantasy,
    adventure,
    animation
  };
}

// ============================================================
// CLASSIFY ALL
// ============================================================

function classifyAllMovies() {

  for (
    const movie
    of allMovies
  ) {

    movie.categories =
      classifyMovie(movie);

  }

}

// ============================================================
// GET CATEGORY
// ============================================================

function getCategoryMovies(
  category
) {

  return allMovies.filter(
    movie =>
      movie.categories &&
      movie.categories[category]
  );
}

// ============================================================
// SORT
// ============================================================

function sortMovies(movies) {

  return [...movies].sort(
    (a, b) => {

      const ratingA =
        Number(a.rating) || 0;

      const ratingB =
        Number(b.rating) || 0;

      if (
        ratingA !== ratingB
      ) {

        return (
          ratingB -
          ratingA
        );

      }

      return (
        (Number(b.year) || 0) -
        (Number(a.year) || 0)
      );
    }
  );
}

// ============================================================
// RENDER
// ============================================================

function renderAll() {

  // Trending
  renderSection(
    "trendingGrid",
    "trendingCount",
    sortMovies(allMovies),
    24
  );

  // Bollywood
  renderSection(
    "bollywoodGrid",
    "bollywoodCount",
    sortMovies(
      getCategoryMovies(
        "bollywood"
      )
    ),
    1000
  );

  // Hollywood
  renderSection(
    "hollywoodGrid",
    "hollywoodCount",
    sortMovies(
      getCategoryMovies(
        "hollywood"
      )
    ),
    24
  );

  // South India
  renderSection(
    "southGrid",
    "southCount",
    sortMovies(
      getCategoryMovies(
        "south"
      )
    ),
    1000
  );

  // Tamil
  renderSection(
    "tamilGrid",
    "tamilCount",
    sortMovies(
      getCategoryMovies(
        "tamil"
      )
    ),
    1000
  );

  // Telugu
  renderSection(
    "teluguGrid",
    "teluguCount",
    sortMovies(
      getCategoryMovies(
        "telugu"
      )
    ),
    1000
  );

  // Malayalam
  renderSection(
    "malayalamGrid",
    "malayalamCount",
    sortMovies(
      getCategoryMovies(
        "malayalam"
      )
    ),
    1000
  );

  // Kannada
  renderSection(
    "kannadaGrid",
    "kannadaCount",
    sortMovies(
      getCategoryMovies(
        "kannada"
      )
    ),
    1000
  );

  // Hindi Available
  renderSection(
    "hindiGrid",
    "hindiCount",
    sortMovies(
      getCategoryMovies(
        "hindiAvailable"
      )
    ),
    1000
  );

  // Genres
  renderSection(
    "actionGrid",
    "actionCount",
    sortMovies(
      getCategoryMovies(
        "action"
      )
    ),
    24
  );

  renderSection(
    "comedyGrid",
    "comedyCount",
    sortMovies(
      getCategoryMovies(
        "comedy"
      )
    ),
    24
  );

  renderSection(
    "romanceGrid",
    "romanceCount",
    sortMovies(
      getCategoryMovies(
        "romance"
      )
    ),
    24
  );

  renderSection(
    "thrillerGrid",
    "thrillerCount",
    sortMovies(
      getCategoryMovies(
        "thriller"
      )
    ),
    24
  );

  renderSection(
    "horrorGrid",
    "horrorCount",
    sortMovies(
      getCategoryMovies(
        "horror"
      )
    ),
    24
  );

  renderSection(
    "dramaGrid",
    "dramaCount",
    sortMovies(
      getCategoryMovies(
        "drama"
      )
    ),
    24
  );

  renderSection(
    "sci-fiGrid",
    "sci-fiCount",
    sortMovies(
      getCategoryMovies(
        "sciFi"
      )
    ),
    24
  );

  renderSection(
    "crimeGrid",
    "crimeCount",
    sortMovies(
      getCategoryMovies(
        "crime"
      )
    ),
    24
  );

  renderSection(
    "fantasyGrid",
    "fantasyCount",
    sortMovies(
      getCategoryMovies(
        "fantasy"
      )
    ),
    24
  );

  renderSection(
    "adventureGrid",
    "adventureCount",
    sortMovies(
      getCategoryMovies(
        "adventure"
      )
    ),
    24
  );

  renderSection(
    "animationGrid",
    "animationCount",
    sortMovies(
      getCategoryMovies(
        "animation"
      )
    ),
    24
  );

  // Top Rated
  renderSection(
    "featuredGrid",
    "featuredCount",
    sortMovies(allMovies),
    24
  );

  // New
  renderSection(
    "newGrid",
    "newCount",
    [...allMovies].sort(
      (a, b) =>
        (Number(b.year) || 0) -
        (Number(a.year) || 0)
    ),
    24
  );

  // All movies
  renderAllMovies();

  setText(
    "currentYear",
    new Date().getFullYear()
  );
}

// ============================================================
// RENDER SECTION
// ============================================================

function renderSection(
  gridId,
  countId,
  movies,
  limit
) {

  const grid =
    $(gridId);

  if (!grid) {
    return;
  }

  const count =
    movies.length;

  setText(
    countId,
    `${count} movies`
  );

  const visible =
    movies.slice(
      0,
      limit
    );

  if (!visible.length) {

    grid.innerHTML = `
      <div class="empty-category">
        No movies found yet.
      </div>
    `;

    return;
  }

  grid.innerHTML =
    visible
      .map(createMovieCard)
      .join("");
}

// ============================================================
// ALL MOVIES
// ============================================================

function renderAllMovies() {

  const grid =
    $("allGrid");

  if (!grid) {
    return;
  }

  const movies =
    allMovies.slice(
      0,
      currentPage *
      MOVIES_PER_LOAD
    );

  setText(
    "allCount",
    `${allMovies.length} movies`
  );

  grid.innerHTML =
    movies
      .map(createMovieCard)
      .join("");

  const button =
    $("loadMoreContainer");

  if (button) {

    button.style.display =
      movies.length <
      allMovies.length
        ? "flex"
        : "none";
  }
}

// ============================================================
// MOVIE CARD
// ============================================================

function createMovieCard(movie) {

  const title =
    escapeHTML(movie.title);

  const poster =
    movie.poster ||
    fallbackPoster(
      movie.title
    );

  const rating =
    movie.rating
      ? `⭐ ${movie.rating}`
      : "⭐ N/A";

  return `
    <article
      class="movie-card"
      tabindex="0"
      onclick="openTrailerFromCard('${escapeJS(movie.title)}','${escapeJS(movie.year)}')"
      onkeydown="handleMovieKeydown(event,'${escapeJS(movie.title)}','${escapeJS(movie.year)}')"
    >

      <div class="movie-poster-wrap">

        <img
          class="movie-poster"
          src="${poster}"
          alt="${title}"
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
          ${title}
        </h3>

        <div class="movie-meta">
          ${movie.year || "—"}
        </div>

      </div>

    </article>
  `;
}

// ============================================================
// TRAILER
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
// SEARCH
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

        const query =
          cleanText(
            event.target.value
          );

        const section =
          $("searchResultsSection");

        const grid =
          $("searchResultsGrid");

        if (!query) {

          if (section) {
            section.style.display =
              "none";
          }

          return;
        }

        if (section) {
          section.style.display =
            "block";
        }

        const results =
          allMovies.filter(
            movie =>
              movie.searchText
                .includes(query)
          );

        setText(
          "searchCount",
          `${results.length} movies found`
        );

        if (!results.length) {

          grid.innerHTML = "";

          const noResults =
            $("noResults");

          if (noResults) {
            noResults.style.display =
              "block";
          }

          return;
        }

        const noResults =
          $("noResults");

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
    );
  }

  if (clear) {

    clear.addEventListener(
      "click",
      () => {

        if (input) {
          input.value = "";
        }

        const section =
          $("searchResultsSection");

        if (section) {
          section.style.display =
            "none";
        }
      }
    );
  }
}

// ============================================================
// LOAD MORE
// ============================================================

function setupLoadMore() {

  const button =
    $("loadMoreButton");

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    () => {

      currentPage++;

      renderAllMovies();
    }
  );
}

// ============================================================
// CATEGORY NAV
// ============================================================

function showCategory(
  category
) {

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
// DEBUG COUNTS
// ============================================================

function printCategoryCounts() {

  const categories = [

    "bollywood",
    "south",
    "tamil",
    "telugu",
    "malayalam",
    "kannada",
    "hindiAvailable",
    "hollywood"
  ];

  console.log(
    "================================"
  );

  console.log(
    "XYZMOVIEDAILY CATEGORY COUNTS"
  );

  console.log(
    "================================"
  );

  for (
    const category
    of categories
  ) {

    console.log(
      category,
      getCategoryMovies(
        category
      ).length
    );
  }

  console.log(
    "TOTAL UNIQUE MOVIES:",
    allMovies.length
  );

  console.log(
    "================================"
  );
}

// ============================================================
// LOADING
// ============================================================

function showLoading(show) {

  const element =
    $("loading");

  if (!element) {
    return;
  }

  element.style.display =
    show
      ? "flex"
      : "none";
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

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    loadMovies
  );
}

// ============================================================
// ESCAPE
// ============================================================

function escapeHTML(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJS(value) {

  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

// ============================================================
// START
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupSearch();

    setupLoadMore();

    setupRetry();

    loadMovies();

  }
);

// ============================================================
// GLOBAL
// ============================================================

window.openTrailerFromCard =
  openTrailerFromCard;

window.handleMovieKeydown =
  handleMovieKeydown;

window.showCategory =
  showCategory;

window.loadMoreMovies =
  () => {

    currentPage++;

    renderAllMovies();
  };
