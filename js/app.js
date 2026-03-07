// CONSTANTES PARA API
// La clave de TMDB NO está aquí: las peticiones pasan por un Cloudflare Worker
// (ver worker/worker.js), que añade la clave guardada como secret en Cloudflare.
const API_URL = "https://moviex-tmdb.simonetandreu.workers.dev/";
const IMG_URL = "https://image.tmdb.org/t/p/w1280";

// Llama a la API de TMDB a través del proxy
async function tmdb(path, params = {}) {
	const qs = new URLSearchParams({ path, ...params });
	const resp = await fetch(`${API_URL}?${qs}`);
	if (!resp.ok) throw new Error(`Error ${resp.status} al consultar ${path}`);
	return resp.json();
}

// CONSTANTES DE DOCUMENTO
const input = document.querySelector(".search input");
const btn = document.querySelector(".search button");
const main_grid_title = document.querySelector(".favorites h2");
const main_grid = document.querySelector(".favorites .movies-grid");
const trending_el = document.querySelector(".trending .movies-grid");
const popup_container = document.querySelector(".popup-container");

add_to_dom_trending();
fetch_favorite_movies();
btn.addEventListener("click", add_searched_movies_to_dom);

input.addEventListener("keyup", function (event) {
	event.preventDefault();
	if (event.key === "Enter") {
		btn.click();
	}
});

// FUNCIONES DE LOCAL STORAGE PARA PELÍCULAS FAVORITAS

function get_LS() {
	const movie_ids = JSON.parse(localStorage.getItem("movie-id"));

	return movie_ids === null ? [] : movie_ids;
}

function add_to_LS(id) {
	const movie_ids = get_LS();

	localStorage.setItem("movie-id", JSON.stringify([...movie_ids, id]));
}

function remove_LS(id) {
	const movie_ids = get_LS();

	localStorage.setItem(
		"movie-id",
		JSON.stringify(movie_ids.filter((e) => e !== id)),
	);
}

async function fetch_favorite_movies() {
	main_grid.innerHTML = "";
	const movies_favorites = await get_LS();
	const movies = [];

	for (let i = 0; i <= movies_favorites.length - 1; i++) {
		const movie_id = movies_favorites[i];
		let movie = await get_movies_by_id(movie_id);
		add_favorites_to_dom(movie);
		movies.push(movie);
	}
}

// PERMITE AGREGAR EFECTO DE CLICK A CADA CARD
function add_click_effect_to_card(cards) {
	cards.forEach((card) => {
		card.addEventListener("click", () => show_popup(card));
	});
}

// FUNCIONES DE BÚSQUEDA
async function get_movies_by_search(search) {
	const respData = await tmdb("search/movie", { query: search });

	return respData.results;
}

// LISTA LAS PELÍCULAS BUSCADAS AL DOM
async function add_searched_movies_to_dom(movies) {
	const data = await get_movies_by_search(input.value);

	main_grid_title.textContent = `Resultados de Búsqueda...`;
	main_grid.innerHTML = data
		.map((e) => {
			return `
            <div class="card" data-id="${e.id}">
              <div class="img">
                <img src="${IMG_URL + e.poster_path}">
              </div>
              <div class="info">
                <h3>${e.title}</h3>
                <div class="single-info">
                  <span>Rate: </span>
                  <span class="rate">${e.vote_average} / 10</span>
                </div>
                <div class="single-info">
                  <span>Release Date: </span>
                  <span>${e.release_date}</span>
                </div>
              </div>
            </div>
          `;
		})
		.join("");

	const cards = document.querySelectorAll(".card");
	add_click_effect_to_card(cards);
}

// FUNCIONES DE CADA PELÍCULA
async function get_movies_by_id(id) {
	const respData = await tmdb(`movie/${id}`);

	return respData;
}

async function get_movie_trailer(id) {
	const respData = await tmdb(`movie/${id}/videos`);

	return respData.results[0].key;
}

async function get_movie_provider(id) {
	const respData = await tmdb(`movie/${id}/watch/providers`);

	const providers =
		(respData.results && respData.results.ES && respData.results.ES.flatrate) ||
		[];

	const images = providers.map((provider) => {
		return {
			logo_url: `${IMG_URL + provider.logo_path}`,
		};
	});

	return images;
}

// FUNCIONES DE USO POPUP
async function show_popup(card) {
	popup_container.classList.add("show-popup");

	const movie_id = card.getAttribute("data-id");
	const movie = await get_movies_by_id(movie_id);
	const movie_trailer = await get_movie_trailer(movie_id);
	var overview_sliced = null;

	console.log("length: " + movie.overview.length);

	if (movie.overview.length > 195) {
		for (let i = 195; i < movie.overview.length; i++) {
			if (movie.overview.charAt(i) == " ") {
				console.log("i = " + i);
				overview_sliced = movie.overview.slice(0, i) + "...";
				break;
			}
		}
	} else {
		overview_sliced = movie.overview;
	}

	console.log("sliced:" + overview_sliced);
	console.log("normal:" + movie.overview);

	popup_container.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, .8), rgba(0, 0, 0, 1)), url(${
		IMG_URL + movie.poster_path
	})`;

	popup_container.innerHTML = `
                          <i class="fa-solid fa-x x-icon"></i>
                          <div class="content">
                            <div class="left">
                              <div class="poster-img">
                                <img src="${
																	IMG_URL + movie.poster_path
																}" alt="">
                              </div>
                              <div class="single-info">
                                <span>Add to Favorites:</span>
                                <i class="fa-regular fa-heart heart-icon normal-color"></i>
                              </div>
                            </div>
                            <div class="right">
                              <h2>${movie.title}</h2>
                              <h4>${movie.tagline}</h4>
                              <div class="single-info-container">
                                <div class="single-info">
                                  <span>Language:</span>
                                  <span>${movie.spoken_languages[0].name}</span>
                                </div>
                                <div class="single-info">
                                  <span>Length:</span>
                                  <span>${movie.runtime} minutes</span>
                                </div>
                                <div class="single-info">
                                  <span>Rate:</span>
                                  <span class="rate">${
																		movie.vote_average
																	} / 10</span>
                                </div>
                                <div class="single-info">
                                  <span>Budget:</span>
                                  <span>$ ${movie.budget}</span>
                                </div>
                                <div class="single-info">
                                  <span>Release Date:</span>
                                  <span>${movie.release_date}</span>
                                </div>
                                <div class="single-info" id="providers">
                                  <span>Where to see:</span>
                                  <ul class="where-see">
                                  </ul>
                                </div>
                              </div>
                              <div class="genres">
                                <h3>Genres</h3>
                                <ul>
                                  ${movie.genres
																		.map((e) => `<li>${e.name}</li>`)
																		.join("")}
                                </ul>
                              </div>
                              <div class="overview">
                                <h3>Overview</h3>
                                <p>${overview_sliced}</p>
                              </div>
                              <div class="trailer">
                                <h3>Trailer</h3>
                                <iframe width="560" height="315" src="https://youtube.com/embed/${movie_trailer}" title="YouTube video player" frameborder="0" allowfullscreen></iframe>
                              </div>
                            </div>
                          </div>
                        `;

	const x_icon = document.querySelector(".x-icon");
	x_icon.addEventListener("click", () => {
		popup_container.classList.remove("show-popup");
	});

	const heart_icon = popup_container.querySelector(".heart-icon");
	const movie_ids = get_LS();

	for (let i = 0; i <= movie_ids.length; i++) {
		if (movie_ids[i] == movie_id) {
			heart_icon.classList.add("liked-color");
			heart_icon.classList.remove("normal-color");
			heart_icon.classList.add("fa-solid");
			heart_icon.classList.remove("fa-regular");
		}
	}

	heart_icon.addEventListener("click", () => {
		if (heart_icon.classList.contains("normal-color")) {
			heart_icon.classList.remove("fa-regular");
			heart_icon.classList.remove("normal-color");
			heart_icon.classList.add("fa-solid");
			heart_icon.classList.add("liked-color");
			add_to_LS(movie_id);
		} else {
			heart_icon.classList.remove("fa-solid");
			heart_icon.classList.remove("liked-color");
			heart_icon.classList.add("fa-regular");
			heart_icon.classList.add("normal-color");
			remove_LS(movie_id);
		}
		fetch_favorite_movies();
		main_grid_title.textContent = `Favoritos`;
	});

	const provider_list = document.querySelector(".where-see");

	get_movie_provider(movie_id).then((images) => {
		images.forEach((image) => {
			provider_list.innerHTML += `
        <li><img src="${image.logo_url}"></li>
      `;
		});
	});
}

// LISTAR PELÍCULAS FAVORITAS EN EL DOM
function add_favorites_to_dom(movie_data) {
	main_grid.innerHTML += `
      <div class="card" data-id="${movie_data.id}">
        <div class="img">
          <img src="${IMG_URL + movie_data.poster_path}">
        </div>
        <div class="info">
          <h3>${movie_data.title}</h3>
          <div class="single-info">
            <span>Rate: </span>
            <span>${movie_data.vote_average} / 10</span>
          </div>
          <div class="single-info">
            <span>Release Date: </span>
            <span>${movie_data.release_date}</span>
          </div>
        </div>
      </div>
  `;

	const cards = document.querySelectorAll(".card");
	add_click_effect_to_card(cards);
}

// LISTAR PELÍCULAS POPULARES AL DOM
async function get_trending_movies() {
	const respData = await tmdb("trending/all/week");

	return respData.results;
}

async function add_to_dom_trending() {
	const data = await get_trending_movies();

	trending_el.innerHTML = data
		.slice(0, 18)
		.map((e) => {
			return `
        <div class="card" data-id="${e.id}">
          <div class="img">
            <img src="${IMG_URL + e.poster_path}">
          </div>
          <div class="info">
            <h3>${e.title}</h3>
            <div class="single-info">
              <span>Rate: </span>
              <span>${e.vote_average} / 10</span>
            </div>
            <div class="single-info">
              <span>Release Date: </span>
              <span>${e.release_date}</span>
            </div>
          </div>
        </div>
    `;
		})
		.join("");

	const cards = document.querySelectorAll(".card");
	add_click_effect_to_card(cards);
}
