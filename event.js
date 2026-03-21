const SEATGEEK_CLIENT_ID = 'NTU0MjUzNTh8MTc2ODM0OTI3Mi44Nzc5ODI';

async function getDailyEvents() {
    const CACHE_KEY = 'future_window_events_cache';
    const cachedData = localStorage.getItem(CACHE_KEY);
    const now = new Date().getTime();

    if (cachedData) {
        const { timestamp, events } = JSON.parse(cachedData);
        if (now - timestamp < 86400000) return events;
    }

    const events = await fetchFutureEvents();
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: now, events }));
    return events;
}

async function fetchFutureEvents() {
    const dateStart = new Date();
    dateStart.setDate(dateStart.getDate() + 4);
    const dateEnd = new Date();
    dateEnd.setDate(dateEnd.getDate() + 5);

    const startStr = dateStart.toISOString().split('T')[0];
    const endStr = dateEnd.toISOString().split('T')[0];

    try {
        const url = `https://api.seatgeek.com/2/events?taxonomies.name=concert&sort=datetime_local.asc&datetime_local.gte=${startStr}&datetime_local.lte=${endStr}&per_page=6&client_id=${SEATGEEK_CLIENT_ID}`;
        const response = await fetch(url);
        const data = await response.json();

        return data.events.map(event => ({
            name: event.title,
            date: event.datetime_local.split('T')[0],
            venue: event.venue.name,
            city: event.venue.display_location,
            image: event.performers[0]?.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80'
        }));
    } catch (error) {
        console.error("SeatGeek API Error:", error);
        return [];
    }
}

function renderEvents(events) {
    const container = document.querySelector('#events .events-list');
    if (!container) return;

    container.innerHTML = events.map(ev => `
        <article class="event-card" style="cursor: default;">
            <div class="event-img-container">
                <img src="${ev.image}" alt="${ev.name}">
            </div>
            <div class="event-info">
                <h3>${ev.name}</h3>
                <p class="event-date">📅 ${new Date(ev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                <p>🏟️ ${ev.venue}</p>
                <p class="location">📍 ${ev.city}</p>
            </div>
        </article>
    `).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
    const events = await getDailyEvents();
    renderEvents(events);
});