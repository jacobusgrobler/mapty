'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

//map and mapEvent declared globally as it is used in two functions

class Workout {
  date = new Date(); //date = new Date();
  id = (Date.now() + '').slice(-10); //id = (Date.now() + '').slice(-10);
  clicks = 0; //counting the clicks

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on 
    ${months[this.date.getMonth()]}
    ${this.date.getDate()}`;
  }

  click() {
    this.clicks++; //counting the clicks
  }
}
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/////////////////////////////////////////////////////
//APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  //CODE FROM CONSTRUCTOR IS EXECUTED WHEN APPLICATION LOADS.
  constructor() {
    //get users position
    this._getPosition();

    //get user data from local storage
    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this)); //this will point to the DOM element that is calling the callback function.  //this will point to form. //so we have to bind it to _newWorkout

    //by changing the input type with the dropdown you will toggle between the elevation and cadence field
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this)); //binding this to _moveToPopup method.
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), //binding loadMap to the this key word.
        function () {
          alert('YOU ARE LOST');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords; //destructured
    const { longitude } = position.coords; //destructured
    console.log(
      `https://www.google.com/maps/place/Johannesburg/@${latitude},${longitude}`
    );

    const coords = [latitude, longitude];
    console.log(this);
    this.#map = L.map('map').setView(coords, (this.#mapZoomLevel = 13));
    //console.log(map);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    //Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    //Display info input fields
    form.classList.remove('hidden'); //this will reveal the workout form
    inputDistance.focus(); //this will focus the curser on the distance input field
  }

  _hideForm() {
    //empty fields
    inputDistance.value = '';
    inputCadence.value = '';
    inputDuration.value = '';
    inputElevation.value = '';
    form.style.display = 'none'; //to stop the form vertical movement
    form.classList.add('hidden'); //this will hide the workout form
    setTimeout(() => (form.style.display = 'grid'), 1000); //to stop the form vertical movement
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value; //+ converts to number
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //If activity running create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //Check if the data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
      )
        return alert('Must be positive number you bum');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If activity cycling create cycling object
    if (type === 'cycling') {
      //Check if the data is valid
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Must be positive numbers you bum');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add new workout object to workout array
    this.#workouts.push(workout);

    //Render workout as marker on map
    this._renderWorkoutMarker(workout);

    //Render workout on list
    this._renderWorkout(workout);

    //Clear input fields and hide form
    this._hideForm();

    //set local storage for all workouts  //load from local storage?
    this._setLocalStorage();
  }
  //method for rendering workout
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    //DOM manipulation

    let html = `
      <li class="workout ${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
         <span class="workout__icon">${
           workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
         }</span>
         <span class="workout__value">${workout.distance}</span>
         <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
         <span class="workout__icon">⏱</span>
         <span class="workout__value">${workout.duration}</span>
         <span class="workout__unit">min</span>
        </div>`;
    if (workout.type === 'running')
      html += `
        <div class="workout__details">
         <span class="workout__icon">⚡️</span>
         <span class="workout__value">${workout.pace.toFixed(1)}</span>
         <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
         <span class="workout__icon">🦶🏼</span>
         <span class="workout__value">${workout.cadence}</span>
         <span class="workout__unit">spm</span>
        </div>
        </li>
        `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
         <span class="workout__icon">⚡️</span>
         <span class="workout__value">${workout.speed.toFixed(1)}</span>
         <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
         <span class="workout__icon">⛰</span>
         <span class="workout__value">${workout.elevationGain}</span>
         <span class="workout__unit">m</span>
        </div>
      </li>`;

    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEL = e.target.closest('.workout');
    console.log(workoutEL);

    if (!workoutEL) return;

    const workout = this.#workouts.find(
      //linking class element workout id to workoutEL id in the dataset.
      work => work.id === workoutEL.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    //counting clicks with public interface
    //workout.click();
  } //OBJECTS COMING FROM LOCAL STORAGE WILL NOT INHERIT METHODS THEY ARE NORMAL OBJECTS
  _setLocalStorage() {
    //local storage API is provided by the browser slows down the application.
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  //loading data from local storage
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts')); //JSON.parse reads data and places in to an array.
    console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  //Reset workouts - clear workouts and reload page.
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

//IMPROVEMENTS EASY
//EDIT DELETE WORKOUTS
//RESET ALL WORKOUTS
//SORT ALL WORKOUTS
//REBUILD OBJECTS COMING FROM LOCAL STORAGE
//MORE REALISTIC MESSAGES FOR INCORRECT INPUT (MAKE IT LOOK PRETTIER)

//IMPROVEMENTS HARD
//REPOSITION MAP TO SHOW ALL WORKOUTS
//DRAW LINES IN STEAD OF POINTS
