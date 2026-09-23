/* =========================================================
   XYZMOVIEDAILY
   Movie Data + Categories + Search + Trailers
   ========================================================= */

"use strict";


/* =========================================================
   SETTINGS
   ========================================================= */

const API_BASE = "https://v3-cinemeta.strem.io";

const PAGE_SIZE = 100;
const PAGES_PER_CATALOG = 5;

const CATALOGS = [
  {
    id: "top",
    name: "Trending"
  },
  {
    id: "imdbRating",
    name: "Top Rated"
  },
  {
    id: "year",
    name: "New Movies"
  }
];


/* =========================================================
   APP STATE
   ========================================================= */

let allMovies = [];

let trendingMovies = [];
let featuredMovies = [];
let newMovies = [];

let currentCategory = "all";

let searchTimer = null;

let isLoading = false;


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  setupNavigation();
  setupSearch();
  setupCategoryButtons();
  setupRetryButton();
  setupLoadMore();

  setupYear();

  loadMovies();

});


/* =========================================================
   YEAR
   ========================================================= */

function setupYear() {

  const yearElement = $("currentYear");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupNavigation() {

  const menuButton = $("mobileMenuButton");
  const nav = $("mainNav");

  if (!menuButton || !nav) {
    return;
  }

  menuButton.addEventListener("click", () => {

    nav.classList.toggle("open");

  });


  nav.querySelectorAll("a").forEach(link => {

    link.addEventListener("click", () => {

      nav.classList.remove("open");

    });

  });


  const logo = $("homeLogo");

  if (logo) {

    logo.addEventListener("click", event => {

      event.preventDefault();

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    });

  }

}


/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {

  const input = $("searchInput");
  const clearButton = $("clearSearch");

  if (!input) {
    return;
  }


  input.addEventListener("input", () => {

    const value = input.value.trim();

    if (clearButton) {

      clearButton.style.display =
        value.length > 0 ? "flex" : "none";

    }

    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {

      performSearch(value);

    }, 150);

  });


  if (clearButton) {

    clearButton.addEventListener("click", () => {

      input.value = "";

      clearButton.style.display = "none";

      performSearch("");

      input.focus();

    });

  }

}


/* =========================================================
   SEARCH MOVIES
   ========================================================= */

function performSearch(query) {

  const section = $("searchResultsSection");
  const grid = $("searchResultsGrid");
  const count = $("searchCount");
  const noResults = $("noResults");

  if (!section || !grid) {
    return;
  }


  if (!query) {

    section.hidden = true;

    grid.innerHTML = "";

    if (noResults) {
      noResults.hidden = true;
    }

    return;

  }


  const searchText = query.toLowerCase();


  const results = allMovies.filter(movie => {

    const title = String(movie.title || "").toLowerCase();

    const description =
      String(movie.description || "").toLowerCase();

    return (
      title.includes(searchText) ||
      description.includes(searchText)
    );

  });


  section.hidden = false;


  if (count) {

    count.textContent =
      `${results.length} Movie${results.length === 1 ? "" : "s"}`;

  }


  if (results.length === 0) {

    grid.innerHTML = "";

    if (noResults) {
      noResults.hidden = false;
    }

    return;

  }


  if (noResults) {
    noResults.hidden = true;
  }


  grid.innerHTML = results
    .slice(0, 100)
    .map(createMovieCard)
    .join("");

}


/* =========================================================
   CATEGORY BUTTONS
   ========================================================= */

function setupCategoryButtons() {

  const buttons =
    document.querySelectorAll(".category-chip");


  buttons.forEach(button => {

    button.addEventListener("click", () => {

      const category =
        button.dataset.category;

      setActiveCategory(button);

      showCategory(category);

    });

  });

}


/* =========================================================
   ACTIVE CATEGORY
   ========================================================= */

function setActiveCategory(activeButton) {

  document
    .querySelectorAll(".category-chip")
    .forEach(button => {

      button.classList.remove("active");

    });


  if (activeButton) {
    activeButton.classList.add("active");
  }

}


/* =========================================================
   SHOW CATEGORY
   ========================================================= */

function showCategory(category) {

  currentCategory = category;


  const targetMap = {

    all: "allMoviesSection",

    trending: "trendingSection",

    bollywood: "bollywoodSection",

    hollywood: "hollywoodSection",

    south: "southSection",

    tamil: "tamilSection",

    telugu: "teluguSection",

    malayalam: "malayalamSection",

    kannada: "kannadaSection",

    hindi: "hindiSection",

    action: "actionGenre",

    comedy: "comedyGenre",

    romance: "romanceGenre",

    thriller: "thrillerGenre",

    horror: "horrorGenre",

    drama: "dramaGenre",

    "sci-fi": "sci-fiGenre",

    crime: "crimeGenre",

    fantasy: "fantasyGenre",

    adventure: "adventureGenre",

    animation: "animationGenre"

  };


  const targetId = targetMap[category];

  if (!targetId) {
    return;
  }


  const target = $(targetId);

  if (!target) {
    return;
  }


  setTimeout(() => {

    const headerHeight = 90;

    const top =
      target.getBoundingClientRect().top +
      window.scrollY -
      headerHeight;

    window.scrollTo({
      top,
      behavior: "smooth"
    });

  }, 50);

}


/* =========================================================
   RETRY
   ========================================================= */

function setupRetryButton() {

  const button = $("retryButton");

  if (!button) {
    return;
  }

  button.addEventListener("click", () => {

    loadMovies();

  });

}


/* =========================================================
   LOAD MORE
   ========================================================= */

function setupLoadMore() {

  const button = $("loadMoreButton");

  if (!button) {
    return;
  }


  button.addEventListener("click", () => {

    loadMoreMovies();

  });

}


/* =========================================================
   LOAD MOVIES
   ========================================================= */

async function loadMovies() {

  if (isLoading) {
    return;
  }


  isLoading = true;


  showLoading(true);
  hideError();


  try {

    const catalogResults = await Promise.allSettled(

      CATALOGS.map(catalog =>
        loadCatalog(catalog)
      )

    );


    let movies = [];


    catalogResults.forEach(result => {

      if (
        result.status === "fulfilled" &&
        Array.isArray(result.value)
      ) {

        movies.push(...result.value);

      }

    });


    if (movies.length === 0) {

      throw new Error(
        "No movies were returned by Cinemeta."
      );

    }


    allMovies = deduplicateMovies(movies);


    /*
      Sort the master collection by rating/year.
    */

    allMovies.sort((a, b) => {

      const ratingA =
        Number.parseFloat(a.rating) || 0;

      const ratingB =
        Number.parseFloat(b.rating) || 0;

      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }


      return Number(b.year || 0) -
             Number(a.year || 0);

    });


    /*
      Create the main groups.
    */

    trendingMovies =
      uniqueMovies(
        getTopMovies(allMovies, 30)
      );


    featuredMovies =
      uniqueMovies(
        [...allMovies]
          .sort(
            (a, b) =>
              (Number.parseFloat(b.rating) || 0) -
              (Number.parseFloat(a.rating) || 0)
          )
          .slice(0, 30)
      );


    newMovies =
      uniqueMovies(
        [...allMovies]
          .sort(
            (a, b) =>
              (Number(b.year) || 0) -
              (Number(a.year) || 0)
          )
          .slice(0, 30)
      );


    /*
      Fetch detailed metadata for a limited number
      of movies so regional/language categories can
      be identified without making hundreds of requests.
    */

    await enrichMovieMetadata(
      allMovies.slice(0, 300)
    );


    /*
      Render everything.
    */

    renderMainSections();


    showLoading(false);

    showPageSections(true);


  } catch (error) {

    console.error(
      "XYZMOVIEDAILY error:",
      error
    );


    showLoading(false);

    showError(
      "Movies could not be loaded. Please try again."
    );

  } finally {

    isLoading = false;

  }

}


/* =========================================================
   LOAD CATALOG
   ========================================================= */

async function loadCatalog(catalog) {

  const requests = [];


  for (
    let page = 0;
    page < PAGES_PER_CATALOG;
    page++
  ) {

    const skip =
      page * PAGE_SIZE;


    const url =
      createCatalogURL(
        catalog,
        skip
      );


    requests.push(
      fetchCatalog(url)
    );

  }


  const results =
    await Promise.allSettled(requests);


  const movies = [];


  results.forEach(result => {

    if (
      result.status === "fulfilled" &&
      Array.isArray(result.value)
    ) {

      movies.push(...result.value);

    }

  });


  return movies;

}


/* =========================================================
   CINEMETA CATALOG URL
   ========================================================= */

function createCatalogURL(
  catalog,
  skip = 0
) {

  if (skip === 0) {

    return (
      `${API_BASE}/catalog/movie/` +
      `${catalog.id}.json`
    );

  }


  return (
    `${API_BASE}/catalog/movie/` +
    `${catalog.id}/skip=${skip}.json`
  );

}


/* =========================================================
   FETCH CATALOG
   ========================================================= */

async function fetchCatalog(url) {

  const response =
    await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });


  if (!response.ok) {

    throw new Error(
      `Cinemeta HTTP ${response.status}`
    );

  }


  const data =
    await response.json();


  const metas =
    Array.isArray(data.metas)
      ? data.metas
      : [];


  return metas.map(normalizeMovie);

}


/* =========================================================
   NORMALIZE MOVIE
   ========================================================= */

function normalizeMovie(movie) {

  const genres =
    Array.isArray(movie.genres)
      ? movie.genres
      : [];


  const language =
    movie.language ||
    movie.lang ||
    movie.originalLanguage ||
    "";


  const country =
    Array.isArray(movie.country)
      ? movie.country.join(", ")
      : (
        movie.country ||
        ""
      );


  return {

    id:
      movie.id ||
      movie.imdb_id ||
      movie.imdbId ||
      movie.name,

    title:
      movie.name ||
      movie.title ||
      "Unknown Movie",

    poster:
      movie.poster ||
      movie.posterUrl ||
      "",

    year:
      movie.releaseInfo ||
      movie.year ||
      "",

    rating:
      movie.imdbRating ||
      movie.rating ||
      "",

    description:
      movie.description ||
      "",

    type:
      movie.type ||
      "movie",

    genres: genres,

    language: String(language),

    country: String(country),

    originalLanguage:
      String(
        movie.originalLanguage ||
        ""
      ),

    hindiAvailable:
      Boolean(movie.hindiAvailable)

  };

}


/* =========================================================
   ENRICH METADATA
   ========================================================= */

async function enrichMovieMetadata(movies) {

  const batchSize = 8;


  for (
    let i = 0;
    i < movies.length;
    i += batchSize
  ) {

    const batch =
      movies.slice(
        i,
        i + batchSize
      );


    await Promise.all(

      batch.map(async movie => {

        if (!movie.id) {
          return;
        }


        /*
          Only request IMDb-style IDs.
        */

        if (
          !String(movie.id)
            .toLowerCase()
            .startsWith("tt")
        ) {

          return;

        }


        try {

          const url =
            `${API_BASE}/meta/movie/` +
            `${encodeURIComponent(movie.id)}.json`;


          const response =
            await fetch(url);


          if (!response.ok) {
            return;
          }


          const data =
            await response.json();


          const meta =
            data && data.meta
              ? data.meta
              : null;


          if (!meta) {
            return;
          }


          if (
            Array.isArray(meta.genres) &&
            meta.genres.length
          ) {

            movie.genres =
              meta.genres;

          }


          if (meta.language) {

            movie.language =
              String(meta.language);

          }


          if (meta.country) {

            movie.country =
              String(meta.country);

          }


          if (
            meta.description &&
            !movie.description
          ) {

            movie.description =
              meta.description;

          }


          if (
            meta.poster &&
            !movie.poster
          ) {

            movie.poster =
              meta.poster;

          }


          if (
            meta.releaseInfo &&
            !movie.year
          ) {

            movie.year =
              meta.releaseInfo;

          }


          if (
            meta.imdbRating &&
            !movie.rating
          ) {

            movie.rating =
              meta.imdbRating;

          }


        } catch (error) {

          /*
            Individual metadata failures are ignored.
            The movie remains available.
          */

        }

      })

    );


    /*
      Small pause between batches.
      This helps avoid firing hundreds of requests
      at the same time.
    */

    await wait(40);

  }

}


/* =========================================================
   CATEGORY CLASSIFICATION
   ========================================================= */

function classifyMovie(movie) {

  const language =
    String(
      movie.language || ""
    ).toLowerCase();


  const originalLanguage =
    String(
      movie.originalLanguage || ""
    ).toLowerCase();


  const country =
    String(
      movie.country || ""
    ).toLowerCase();


  const title =
    String(
      movie.title || ""
    ).toLowerCase();


  const genreText =
    Array.isArray(movie.genres)
      ? movie.genres
          .join(" ")
          .toLowerCase()
      : "";


  const text =
    [
      language,
      originalLanguage,
      country,
      title,
      genreText
    ].join(" ");


  const categories = new Set();


  /*
    LANGUAGE DETECTION
  */

  const isTamil =
    /\btamil\b/.test(text) ||
    /\btam\b/.test(language);


  const isTelugu =
    /\btelugu\b/.test(text) ||
    /\btel\b/.test(language);


  const isMalayalam =
    /\bmalayalam\b/.test(text) ||
    /\bmal\b/.test(language);


  const isKannada =
    /\bkannada\b/.test(text) ||
    /\bkan\b/.test(language);


  const isHindi =
    /\bhindi\b/.test(text) ||
    /\bhin\b/.test(language);


  const isIndian =
    /\bindia\b/.test(country) ||
    /\bindian\b/.test(country) ||
    isTamil ||
    isTelugu ||
    isMalayalam ||
    isKannada ||
    isHindi;


  /*
    SOUTH INDIAN
  */

  if (
    isTamil ||
    isTelugu ||
    isMalayalam ||
    isKannada
  ) {

    categories.add("south");

  }


  if (isTamil) {
    categories.add("tamil");
  }

  if (isTelugu) {
    categories.add("telugu");
  }

  if (isMalayalam) {
    categories.add("malayalam");
  }

  if (isKannada) {
    categories.add("kannada");
  }


  /*
    BOLLYWOOD

    Hindi + India is treated as Bollywood-style
    classification.
  */

  if (
    isHindi &&
    isIndian
  ) {

    categories.add("bollywood");

  }


  /*
    HINDI AVAILABLE

    This is deliberately separate from Bollywood.

    A movie can be a non-Bollywood movie and still
    have Hindi metadata.
  */

  if (
    isHindi ||
    movie.hindiAvailable === true
  ) {

    categories.add("hindi");

  }


  /*
    HOLLYWOOD

    English-language movies outside India.
  */

  const isEnglish =
    /\benglish\b/.test(language) ||
    /\beng\b/.test(language) ||
    /\benglish\b/.test(
      originalLanguage
    );


  const isNonIndian =
    !isIndian &&
    !/\bindia\b/.test(country);


  if (
    isEnglish &&
    isNonIndian
  ) {

    categories.add("hollywood");

  }


  /*
    GENRES
  */

  const genreMap = {

    action: [
      "action"
    ],

    comedy: [
      "comedy"
    ],

    romance: [
      "romance"
    ],

    thriller: [
      "thriller"
    ],

    horror: [
      "horror"
    ],

    drama: [
      "drama"
    ],

    "sci-fi": [
      "sci-fi",
      "science fiction"
    ],

    crime: [
      "crime"
    ],

    fantasy: [
      "fantasy"
    ],

    adventure: [
      "adventure"
    ],

    animation: [
      "animation"
    ]

  };


  Object.entries(
    genreMap
  ).forEach(
    ([category, values]) => {

      if (
        values.some(
          value =>
            genreText.includes(value)
        )
      ) {

        categories.add(category);

      }

    }
  );


  return categories;

}


/* =========================================================
   RENDER MAIN SECTIONS
   ========================================================= */

function renderMainSections() {

  /*
    Main collections.
  */

  renderMovieGrid(
    "trendingGrid",
    trendingMovies,
    "trendingCount"
  );


  renderMovieGrid(
    "featuredGrid",
    featuredMovies,
    "featuredCount"
  );


  renderMovieGrid(
    "newGrid",
    newMovies,
    "newCount"
  );


  /*
    Regional categories.
  */

  renderCategory(
    "bollywood",
    "bollywoodGrid",
    "bollywoodCount"
  );


  renderCategory(
    "hollywood",
    "hollywoodGrid",
    "hollywoodCount"
  );


  renderCategory(
    "south",
    "southGrid",
    "southCount"
  );


  renderCategory(
    "tamil",
    null,
    "tamilCount",
    20
  );


  renderCategory(
    "telugu",
    null,
    "teluguCount",
    20
  );


  renderCategory(
    "malayalam",
    null,
    "malayalamCount",
    20
  );


  renderCategory(
    "kannada",
    null,
    "kannadaCount",
    20
  );


  renderCategory(
    "hindi",
    "hindiGrid",
    "hindiCount"
  );


  /*
    Genres.
  */

  const genres = [
    "action",
    "comedy",
    "romance",
    "thriller",
    "horror",
    "drama",
    "sci-fi",
    "crime",
    "fantasy",
    "adventure",
    "animation"
  ];


  genres.forEach(genre => {

    renderCategory(
      genre,
      `${genre}Grid`,
      `${genre}Count`,
      20
    );

  });


  /*
    Full collection.
  */

  renderMovieGrid(
    "allGrid",
    allMovies.slice(0, 100),
    "allCount"
  );

}


/* =========================================================
   RENDER CATEGORY
   ========================================================= */

function renderCategory(
  category,
  gridId,
  countId,
  limit = 30
) {

  const matching =
    getMoviesForCategory(
      category
    );


  const movies =
    matching.slice(
      0,
      limit
    );


  if (gridId) {

    renderMovieGrid(
      gridId,
      movies,
      countId
    );

  } else {

    updateCount(
      countId,
      matching.length
    );

  }

}


/* =========================================================
   GET MOVIES FOR CATEGORY
   ========================================================= */

function getMoviesForCategory(
  category
) {

  return allMovies.filter(movie => {

    const categories =
      classifyMovie(movie);

    return categories.has(
      category
    );

  });

}


/* =========================================================
   RENDER MOVIE GRID
   ========================================================= */

function renderMovieGrid(
  gridId,
  movies,
  countId
) {

  const grid = $(gridId);


  if (!grid) {
    return;
  }


  if (!movies || movies.length === 0) {

    grid.innerHTML =
      createEmptyCategoryMessage();

    updateCount(
      countId,
      0
    );

    return;

  }


  grid.innerHTML =
    movies
      .map(createMovieCard)
      .join("");


  updateCount(
    countId,
    movies.length
  );

}


/* =========================================================
   CREATE MOVIE CARD
   ========================================================= */

function createMovieCard(movie) {

  const title =
    escapeHTML(
      movie.title || "Unknown Movie"
    );


  const year =
    escapeHTML(
      String(movie.year || "")
    );


  const rating =
    movie.rating
      ? `⭐ ${escapeHTML(
          String(movie.rating)
        )}`
      : "⭐ N/A";


  const poster =
    movie.poster ||
    createFallbackPoster(
      movie.title
    );


  const safePoster =
    escapeAttribute(
      poster
    );


  const safeId =
    escapeAttribute(
      movie.id || ""
    );


  return `

    <article
      class="movie-card"
      data-movie-id="${safeId}"
      tabindex="0"
      role="button"
      aria-label="Watch trailer for ${title}"
      onclick="openTrailerFromCard(this)"
      onkeydown="handleMovieKeydown(event, this)"
    >

      <div class="movie-poster">

        <img
          src="${safePoster}"
          alt="${title} poster"
          loading="lazy"
          onerror="this.onerror=null;this.src='${createFallbackPosterAttribute(movie.title)}'"
        >

        <div class="poster-play">
          ▶
        </div>

      </div>


      <div class="movie-info">

        <div class="movie-title">
          ${title}
        </div>

        <div class="movie-meta">

          <span class="movie-year">
            ${year || "Movie"}
          </span>

          <span class="movie-rating">
            ${rating}
          </span>

        </div>

      </div>

    </article>

  `;

}


/* =========================================================
   MOVIE CARD KEYBOARD
   ========================================================= */

function handleMovieKeydown(
  event,
  element
) {

  if (
    event.key === "Enter" ||
    event.key === " "
  ) {

    event.preventDefault();

    openTrailerFromCard(
      element
    );

  }

}


/* =========================================================
   OPEN TRAILER
   ========================================================= */

function openTrailerFromCard(
  element
) {

  if (!element) {
    return;
  }


  const id =
    element.dataset.movieId;


  const movie =
    allMovies.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!movie) {
    return;
  }


  openOfficialTrailerSearch(
    movie
  );

}


/* =========================================================
   TRAILER SEARCH
   ========================================================= */

function openOfficialTrailerSearch(
  movie
) {

  const title =
    String(
      movie.title || ""
    ).trim();


  if (!title) {
    return;
  }


  const year =
    movie.year
      ? ` ${movie.year}`
      : "";


  const query =
    `${title}${year} official trailer`;


  const url =
    "https://www.youtube.com/results?search_query=" +
    encodeURIComponent(query);


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

}


/* =========================================================
   DEDUPLICATE
   ========================================================= */

function deduplicateMovies(
  movies
) {

  const map = new Map();


  movies.forEach(movie => {

    const key =
      movie.id ||
      `${movie.title}-${movie.year}`;


    if (!map.has(key)) {

      map.set(
        key,
        movie
      );

    }

  });


  return Array.from(
    map.values()
  );

}


/* =========================================================
   UNIQUE MOVIES
   ========================================================= */

function uniqueMovies(
  movies
) {

  return deduplicateMovies(
    movies
  );

}


/* =========================================================
   TOP MOVIES
   ========================================================= */

function getTopMovies(
  movies,
  limit
) {

  return [...movies]
    .sort((a, b) => {

      const ratingA =
        Number.parseFloat(
          a.rating
        ) || 0;

      const ratingB =
        Number.parseFloat(
          b.rating
        ) || 0;

      return ratingB - ratingA;

    })
    .slice(0, limit);

}


/* =========================================================
   LOAD MORE
   ========================================================= */

function loadMoreMovies() {

  const grid = $("allGrid");

  if (!grid) {
    return;
  }


  const currentlyShown =
    grid.querySelectorAll(
      ".movie-card"
    ).length;


  const nextMovies =
    allMovies.slice(
      currentlyShown,
      currentlyShown + 100
    );


  if (
    nextMovies.length === 0
  ) {

    const button =
      $("loadMoreButton");

    if (button) {

      button.textContent =
        "All Movies Loaded";

      button.disabled = true;

    }

    return;

  }


  grid.insertAdjacentHTML(
    "beforeend",
    nextMovies
      .map(createMovieCard)
      .join("")
  );


  updateCount(
    "allCount",
    Math.min(
      currentlyShown +
      nextMovies.length,
      allMovies.length
    )
  );


  if (
    currentlyShown +
    nextMovies.length >=
    allMovies.length
  ) {

    const button =
      $("loadMoreButton");

    if (button) {

      button.textContent =
        "All Movies Loaded";

      button.disabled = true;

    }

  }

}


/* =========================================================
   EMPTY CATEGORY
   ========================================================= */

function createEmptyCategoryMessage() {

  return `

    <div
      style="
        grid-column: 1 / -1;
        padding: 35px;
        border: 1px solid #242424;
        border-radius: 12px;
        background: #111;
        color: #777;
        text-align: center;
      "
    >
      Movies for this category are being collected.
    </div>

  `;

}


/* =========================================================
   COUNT
   ========================================================= */

function updateCount(
  elementId,
  count
) {

  const element =
    $(elementId);


  if (!element) {
    return;
  }


  element.textContent =
    `${count} Movie${count === 1 ? "" : "s"}`;

}


/* =========================================================
   LOADING
   ========================================================= */

function showLoading(
  visible
) {

  const element =
    $("loading");


  if (!element) {
    return;
  }


  element.hidden =
    !visible;

}


/* =========================================================
   PAGE SECTIONS
   ========================================================= */

function showPageSections(
  visible
) {

  const sections = [

    "trendingSection",
    "bollywoodSection",
    "hollywoodSection",
    "southSection",
    "hindiSection",
    "genresSection",
    "featuredSection",
    "newSection",
    "allMoviesSection"

  ];


  sections.forEach(id => {

    const element = $(id);

    if (element) {
      element.hidden = !visible;
    }

  });

}


/* =========================================================
   ERROR
   ========================================================= */

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
    box.hidden = false;
  }

}


/* =========================================================
   HIDE ERROR
   ========================================================= */

function hideError() {

  const box =
    $("errorBox");


  if (box) {
    box.hidden = true;
  }

}


/* =========================================================
   WAIT
   ========================================================= */

function wait(
  milliseconds
) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        milliseconds
      )
  );

}


/* =========================================================
   FALLBACK POSTER
   ========================================================= */

function createFallbackPoster(
  title
) {

  const safeTitle =
    String(
      title || "Movie"
    )
    .slice(0, 35);


  return (
    "https://dummyimage.com/500x750/" +
    "191919/ffffff&text=" +
    encodeURIComponent(
      safeTitle
    )
  );

}


/* =========================================================
   FALLBACK POSTER ATTRIBUTE
   ========================================================= */

function createFallbackPosterAttribute(
  title
) {

  return escapeAttribute(
    createFallbackPoster(
      title
    )
  );

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHTML(
  value
) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================================================
   ATTRIBUTE ESCAPE
   ========================================================= */

function escapeAttribute(
  value
) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("'", "&#039;");

}


/* =========================================================
   GLOBAL TRAILER FUNCTION
   ========================================================= */

window.openTrailerFromCard =
  openTrailerFromCard;


window.handleMovieKeydown =
  handleMovieKeydown;
