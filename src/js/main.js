
require("./lib/social");
require("./lib/ads");
// var track = require("./lib/tracking");

var $ = require("./lib/qsa");
var flip = require("./lib/flip");
var dot = require("./lib/dot");
// var animateScroll = require("./lib/animateScroll");
var closest = require("./lib/closest");

var modalTemplate = dot.compile(require("./_modal.html"));

var noop = function() {};

var appElement = $.one(".app");
appElement.classList.add("boot");
var listingElement = $.one(".listings");

var categories = {};
var years = {};
var ratings = {};

var items = $(".item", appElement).map(function(b, index) {
  var data = {};
  for (var i = 0; i < b.attributes.length; i++) {
    var attr = b.attributes[i];
    if (attr.name.match(/^data-/)) {
      data[attr.name.replace("data-", "")] = attr.value;
    }
  }

  $("[data-bound]", b).forEach(function(el) {
    var key = el.getAttribute("data-bound");
    data[key] = el.innerHTML;
  });

  data.genre = data.genre.trim().split(/,\s*/);
  data.genres = {};

  data.genre.forEach(g => {
    categories[g] = categories[g] ? categories[g] + 1 : 1;
    data.genres[g] = true;
  });
  years[data.year] = years[data.year] ? years[data.year] + 1 : 1;
  var rating = data.rating.trim() || "Unrated";
  ratings[rating] = ratings[rating] ? ratings[rating] + 1 : 1;

  data.cover = b.querySelector(".cover").getAttribute("src");

  data.element = b;
  data.index = index;
  b.setAttribute("data-index", index);
  return data;
});

var createFilterElements = function(c) {
  return `
  <li>
    <input type="checkbox" id="${c}" value="${c}">
    <label for="${c}">${c} <span class="count">${this[c]}</span></label>
  </li>`
};

var createFilter = function(selector, hash) {
  var filter = $.one(`.filters ul.${selector}`);
  filter.innerHTML = Object.keys(hash).sort().map(createFilterElements.bind(hash)).join("");
  return filter;
}

var catFilter = createFilter("category", categories);

var yearFilter = createFilter("year", years);

var ratingFilter = createFilter("rating", ratings);

var filterElement = $.one(".filters");

var itemCache = [];

var runFilters = function(e) {
  appElement.classList.remove("show-modal");

  var getFilter = element => $("input:checked", element).map(el => el.value);

  var cats = getFilter(catFilter);
  var years = getFilter(yearFilter);
  var ratings = getFilter(ratingFilter);

  var flipping = [];

  //get initial position
  items.forEach(b => b.first = b.element.getBoundingClientRect());

  var found = false;

  itemCache = [];

  items.forEach(function(b) {
    var show = true;
    if (cats.length && !cats.some(c => c in b.genres)) show = false;
    if (years.length && years.indexOf(b.year) < 0) show = false;
    if (ratings.length && ratings.indexOf(b.rating) < 0) show = false;

    b.element.classList.remove("animated");
    var isVisible = !b.element.classList.contains("hidden");
    if (show) {
      itemCache.push(b);
      found = true;
      if (isVisible) {
        flipping.push(b);
      } else {
        b.element.classList.add("animated", "faded");
      }
    }
    b.element.classList[show ? "remove" : "add"]("hidden");
  });

  if (!found) {
    listingElement.classList.add("empty");
  } else {
    listingElement.classList.remove("empty");
    requestAnimationFrame(function() {
      flipping.forEach(function(b) {
        var bounds = b.element.getBoundingClientRect();
        var offset = {
          x: b.first.left - bounds.left,
          y: b.first.top - bounds.top
        };
        b.element.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
        var reflow = b.element.offsetWidth;
        b.element.classList.add("animated");
        b.element.style.transform = "";
      });
      $(".faded").forEach(el => el.classList.remove("faded"));
    });
  }
};

filterElement.addEventListener("change", runFilters);
runFilters();

var modalContent = $.one(".modal .content");
var modalID = null;

var showModal = function(item) {
  modalID = item.index;
  modalContent.innerHTML = modalTemplate(item);
  appElement.classList.add("show-modal", "transition-modal");
  var reflow = appElement.offsetWidth;
  appElement.classList.remove("transition-modal");
  // if (window.innerWidth > 768) animateScroll(appElement);
};

var clickitem = function(e) {
  var id = this.getAttribute("data-index");
  var item = items[id];
  showModal(item);
};

var closeModal = function() {
  modalID = null;
  appElement.classList.remove("show-modal");
};

var expandBlurb = function() {
  var item = closest(this, ".item");
  item.classList.add("expanded");
};

var itemSequence = function() {
  var current = items[modalID];
  var index = itemCache.indexOf(current);
  if (this.classList.contains("next")) {
    index++;
    if (index >= itemCache.length) index = 0;
  } else {
    index--
    if (index < 0) index = itemCache.length - 1;
  }
  var next = itemCache[index];
  showModal(next);
}

items.forEach(function(b) {
  b.element.addEventListener("click", clickitem);
});
$(".close-modal, .modal .backdrop").forEach(el => el.addEventListener("click", closeModal));
$(".modal .in.sequence").forEach(el => el.addEventListener("click", itemSequence));
$(".expand-item").forEach(el => el.addEventListener("click", expandBlurb));
