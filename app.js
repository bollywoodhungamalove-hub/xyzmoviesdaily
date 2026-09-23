/* =====================================================
   XYZMOVIEDAILY
   LARGE MOVIE CATALOG
   NO TMDB
===================================================== */


/* =====================================================
   CONFIGURATION
===================================================== */

const API_BASE =
    "https://v3-cinemeta.strem.io";


/*
    Cinemeta currently exposes movie catalogs such as:

    top
    imdbRating
    year

    It also supports skip pagination.
*/


const CATALOGS = [

    {
        id: "top",
        name: "Trending"
    },

    {
        id: "imdbRating",
        name: "Featured"
    },

    {
        id: "year",
        name: "New"
    }

];


/*
    Number of catalog pages to request.

    Each request asks for another page
    using skip=100, skip=200, etc.

    Increase this later if needed.
*/

const PAGES_PER_CATALOG = 5;


/*
    Number of movies requested per page.
*/

const PAGE_SIZE = 100;


/* =====================================================
   ELEMENTS
===================================================== */

const loading =
    document.getElementById(
        "loading"
    );


const errorBox =
    document.getElementById(
        "errorBox"
    );


const errorText =
    document.getElementById(
        "errorText"
    );


const retryButton =
    document.getElementById(
        "retryButton"
    );


const searchInput =
    document.getElementById(
        "searchInput"
    );


const clearSearch =
    document.getElementById(
        "clearSearch"
    );


const searchResultsSection =
    document.getElementById(
        "searchResultsSection"
    );


const searchResultsGrid =
    document.getElementById(
        "searchResultsGrid"
    );


const searchCount =
    document.getElementById(
        "searchCount"
    );


const noResults =
    document.getElementById(
        "noResults"
    );


const trendingGrid =
    document.getElementById(
        "trendingGrid"
    );


const featuredGrid =
    document.getElementById(
        "featuredGrid"
    );


const newGrid =
    document.getElementById(
        "newGrid"
    );


const allGrid =
    document.getElementById(
        "allGrid"
    );


const trendingCount =
    document.getElementById(
        "trendingCount"
    );


const featuredCount =
    document.getElementById(
        "featuredCount"
    );


const newCount =
    document.getElementById(
        "newCount"
    );


const allCount =
    document.getElementById(
        "allCount"
    );


const loadMoreButton =
    document.getElementById(
        "loadMoreButton"
    );


const loadMoreContainer =
    document.getElementById(
        "loadMoreContainer"
    );


const currentYear =
    document.getElementById(
        "currentYear"
    );


/* =====================================================
   DATA
===================================================== */

let allMovies = [];

let trendingMovies = [];

let featuredMovies = [];

let newMovies = [];


/*
    Current number of movies displayed
    in the big Movie Collection section.
*/

let displayedMovies = 0;


/*
    Number added every time
    "Load More Movies" is clicked.
*/

const LOAD_MORE_AMOUNT = 100;


/* =====================================================
   START
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        currentYear.textContent =
            new Date().getFullYear();

        loadMovieCatalog();

    }
);


/* =====================================================
   LOAD ALL CATALOGS
===================================================== */

async function loadMovieCatalog() {

    showLoading();

    hideError();


    try {

        /*
            Create all requests.

            Example:

            /catalog/movie/top.json
            /catalog/movie/top/skip=100.json
            /catalog/movie/top/skip=200.json

            etc.
        */


        const requests = [];


        for (
            const catalog
            of CATALOGS
        ) {

            for (
                let page = 0;
                page < PAGES_PER_CATALOG;
                page++
            ) {

                const skip =
                    page *
                    PAGE_SIZE;


                const url =
                    createCatalogURL(
                        catalog.id,
                        skip
                    );


                requests.push({

                    catalog:
                        catalog.id,

                    page:
                        page,

                    url:
                        url

                });

            }

        }


        /*
            Request several pages
            at the same time.
        */

        const responses =
            await Promise.allSettled(

                requests.map(
                    request =>
                        fetchCatalog(
                            request.url
                        )
                )

            );


        /*
            Store results separately.
        */

        const trendingData = [];

        const featuredData = [];

        const newData = [];

        const combinedData = [];


        responses.forEach(
            (
                response,
                index
            ) => {

                if (
                    response.status !==
                    "fulfilled"
                ) {

                    console.warn(
                        "Catalog request failed:",
                        requests[index].url
                    );

                    return;

                }


                const catalog =
                    requests[index].catalog;


                const items =
                    response.value;


                if (
                    !Array.isArray(items)
                ) {

                    return;

                }


                combinedData.push(
                    ...items
                );


                if (
                    catalog ===
                    "top"
                ) {

                    trendingData.push(
                        ...items
                    );

                }


                if (
                    catalog ===
                    "imdbRating"
                ) {

                    featuredData.push(
                        ...items
                    );

                }


                if (
                    catalog ===
                    "year"
                ) {

                    newData.push(
                        ...items
                    );

                }

            }
        );


        /*
            Remove duplicates.
        */

        allMovies =
            uniqueMovies(
                combinedData
            );


        trendingMovies =
            uniqueMovies(
                trendingData
            );


        featuredMovies =
            uniqueMovies(
                featuredData
            );


        newMovies =
            uniqueMovies(
                newData
            );


        /*
            Make sure we actually received data.
        */

        if (
            allMovies.length === 0
        ) {

            throw new Error(
                "No movies were returned."
            );

        }


        /*
            Render everything.
        */

        renderTrending();

        renderFeatured();

        renderNewMovies();

        renderAllMovies();


        hideLoading();


    } catch (error) {

        console.error(
            "XYZMOVIEDAILY error:",
            error
        );


        showError(
            "The movie catalog could not be loaded. " +
            "Please refresh the page and try again."
        );


        hideLoading();

    }

}


/* =====================================================
   CREATE CATALOG URL
===================================================== */

function createCatalogURL(
    catalog,
    skip
) {

    if (skip === 0) {

        return (
            `${API_BASE}` +
            `/catalog/movie/` +
            `${catalog}.json`
        );

    }


    return (
        `${API_BASE}` +
        `/catalog/movie/` +
        `${catalog}/` +
        `skip=${skip}.json`
    );

}


/* =====================================================
   FETCH CATALOG
===================================================== */

async function fetchCatalog(
    url
) {

    const response =
        await fetch(
            url,
            {
                method: "GET",

                headers: {
                    "Accept":
                        "application/json"
                },

                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}`
        );

    }


    const data =
        await response.json();


    return (
        data &&
        Array.isArray(data.metas)
            ? data.metas
            : []
    );

}


/* =====================================================
   REMOVE DUPLICATES
===================================================== */

function uniqueMovies(
    movieList
) {

    const map =
        new Map();


    movieList.forEach(
        movie => {

            if (!movie) {
                return;
            }


            const id =
                movie.id ||
                movie.name;


            if (!id) {
                return;
            }


            if (
                !map.has(id)
            ) {

                map.set(
                    id,
                    normalizeMovie(
                        movie
                    )
                );

            }

        }
    );


    return Array.from(
        map.values()
    );

}


/* =====================================================
   NORMALIZE MOVIE
===================================================== */

function normalizeMovie(
    movie
) {

    return {

        id:
            movie.id ||
            movie.name,

        title:
            movie.name ||
            "Unknown Movie",

        poster:
            movie.poster ||
            "",

        year:
            movie.releaseInfo ||
            movie.year ||
            "",

        rating:
            movie.imdbRating ||
            "",

        description:
            movie.description ||
            "",

        type:
            movie.type ||
            "movie"

    };

}


/* =====================================================
   TRENDING
===================================================== */

function renderTrending() {

    /*
        Show the first 100
        popular movies.
    */

    renderMovieList(
        trendingGrid,
        trendingMovies.slice(
            0,
            100
        )
    );


    trendingCount.textContent =
        `${trendingMovies.length} movies`;

}


/* =====================================================
   FEATURED
===================================================== */

function renderFeatured() {

    renderMovieList(
        featuredGrid,
        featuredMovies.slice(
            0,
            100
        )
    );


    featuredCount.textContent =
        `${featuredMovies.length} movies`;

}


/* =====================================================
   NEW
===================================================== */

function renderNewMovies() {

    renderMovieList(
        newGrid,
        newMovies.slice(
            0,
            100
        )
    );


    newCount.textContent =
        `${newMovies.length} movies`;

}


/* =====================================================
   ALL MOVIES
===================================================== */

function renderAllMovies() {

    displayedMovies = 0;

    allGrid.innerHTML = "";


    loadMoreMovies();

}


/* =====================================================
   LOAD MORE
===================================================== */

function loadMoreMovies() {

    const nextMovies =
        allMovies.slice(
            displayedMovies,
            displayedMovies +
                LOAD_MORE_AMOUNT
        );


    if (
        nextMovies.length === 0
    ) {

        loadMoreContainer.style.display =
            "none";

        return;

    }


    renderMovieList(
        allGrid,
        nextMovies,
        true
    );


    displayedMovies +=
        nextMovies.length;


    allCount.textContent =
        `${allMovies.length} movies`;


    if (
        displayedMovies >=
        allMovies.length
    ) {

        loadMoreContainer.style.display =
            "none";

    } else {

        loadMoreContainer.style.display =
            "flex";

    }

}


/* =====================================================
   LOAD MORE BUTTON
===================================================== */

loadMoreButton.addEventListener(
    "click",
    () => {

        loadMoreMovies();

    }
);


/* =====================================================
   RENDER MOVIE LIST
===================================================== */

function renderMovieList(
    container,
    movieList,
    append = false
) {

    if (!append) {

        container.innerHTML = "";

    }


    const fragment =
        document.createDocumentFragment();


    movieList.forEach(
        movie => {

            const card =
                createMovieCard(
                    movie
                );


            fragment.appendChild(
                card
            );

        }
    );


    container.appendChild(
        fragment
    );

}


/* =====================================================
   CREATE MOVIE CARD
===================================================== */

function createMovieCard(
    movie
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "movie-card";


    const title =
        movie.title ||
        "Unknown Movie";


    const poster =
        movie.poster ||
        createFallbackPoster(
            title
        );


    const year =
        movie.year ||
        "";


    const rating =
        movie.rating ||
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

                ${
                    rating
                        ? ` · ⭐ ${escapeHTML(rating)}`
                        : ""
                }
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
                createFallbackPoster(
                    title
                );

        },
        {
            once: true
        }
    );


    card.addEventListener(
        "click",
        () => {

            openTrailer(
                title,
                year
            );

        }
    );


    return card;

}


/* =====================================================
   TRAILER
===================================================== */

function openTrailer(
    title,
    year
) {

    let search =
        `${title} official trailer`;


    if (year) {

        search +=
            ` ${year}`;

    }


    const url =
        "https://www.youtube.com/results" +
        "?search_query=" +
        encodeURIComponent(
            search
        );


    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );

}


/* =====================================================
   SEARCH
===================================================== */

searchInput.addEventListener(
    "input",
    () => {

        const query =
            searchInput.value
                .trim()
                .toLowerCase();


        /*
            If search is empty,
            hide search results.
        */

        if (!query) {

            searchResultsSection.style.display =
                "none";

            return;

        }


        /*
            Hide normal sections
            while searching.
        */

        searchResultsSection.style.display =
            "block";


        const results =
            allMovies.filter(
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


        searchResultsGrid.innerHTML =
            "";


        if (
            results.length === 0
        ) {

            noResults.style.display =
                "block";

            searchCount.textContent =
                "0 movies";

            return;

        }


        noResults.style.display =
            "none";


        searchCount.textContent =
            `${results.length} movies`;


        renderMovieList(
            searchResultsGrid,
            results
        );


        /*
            Scroll to results.
        */

        searchResultsSection.scrollIntoView(
            {
                behavior: "smooth",
                block: "start"
            }
        );

    }
);


/* =====================================================
   CLEAR SEARCH
===================================================== */

clearSearch.addEventListener(
    "click",
    () => {

        searchInput.value = "";

        searchResultsSection.style.display =
            "none";

        searchResultsGrid.innerHTML =
            "";

        searchInput.focus();

    }
);


/* =====================================================
   RETRY
===================================================== */

retryButton.addEventListener(
    "click",
    () => {

        loadMovieCatalog();

    }
);


/* =====================================================
   LOADING
===================================================== */

function showLoading() {

    loading.style.display =
        "flex";

}


function hideLoading() {

    loading.style.display =
        "none";

}


/* =====================================================
   ERROR
===================================================== */

function showError(
    message
) {

    errorText.textContent =
        message;

    errorBox.style.display =
        "block";

}


function hideError() {

    errorBox.style.display =
        "none";

}


/* =====================================================
   FALLBACK POSTER
===================================================== */

function createFallbackPoster(
    title
) {

    return (
        "https://dummyimage.com/" +
        "500x750/" +
        "111111/" +
        "ffffff" +
        "?text=" +
        encodeURIComponent(
            title
        )
    );

}


/* =====================================================
   HTML SAFETY
===================================================== */

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


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}
