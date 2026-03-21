const TMDB_API_KEY = '29a7b8e40eb2ae93da6b67e9a1f0a130';
const getCelebGrid = () => document.getElementById('featured')?.querySelector('.grid');

async function getDailyCelebs() {
    const CACHE_KEY = 'daily_celebrities';
    const cachedData = localStorage.getItem(CACHE_KEY);
    const now = new Date().getTime();

    if (cachedData) {
        const { timestamp, people } = JSON.parse(cachedData);
        if (now - timestamp < 86400000) return people;
    }

    const people = await fetchFromTMDB();
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: now, people }));
    return people;
}

async function fetchFromTMDB() {
    try {
        const [page1, page2] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/person/popular?api_key=${TMDB_API_KEY}&page=1`).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/person/popular?api_key=${TMDB_API_KEY}&page=2`).then(r => r.json())
        ]);

        let allPeople = [...page1.results, ...page2.results].sort(() => Math.random() - 0.5);

        return allPeople.slice(0, 21).map(person => {
            let role = person.known_for_department;
            if (person.known_for.some(m => m.genre_ids?.includes(10402))) role = "Musician / Actor";

            return {
                name: person.name,
                role: role,
                image: person.profile_path ? `https://image.tmdb.org/t/p/w500${person.profile_path}` : 'https://via.placeholder.com/500x750?text=No+Image',
                bio: person.known_for[0] ? `Famous for: ${person.known_for[0].title || person.known_for[0].name}` : "Global entertainment star."
            };
        });
    } catch (error) {
        console.error("TMDB API Error:", error);
        return [];
    }
}

// celeb.js

// ... (keep your existing TMDB fetching logic above)

function renderCelebs(people) {
    const grid = getCelebGrid();
    if (!grid) return;

    grid.innerHTML = people.map(p => `
        <article class="card" onclick="navigateToProfile('${encodeURIComponent(p.name)}')" style="cursor: pointer;">
            <div class="media-container">
                <div class="media" style="background-image:url('${p.image}')"></div>
            </div>
            <div class="info">
                <div class="role-tag">${p.role}</div>
                <div class="name">${p.name}</div>
                <div class="bio">${p.bio}</div>
            </div>
        </article>
    `).join('');
}

// Global navigation function for celebrity cards
window.navigateToProfile = (celebName) => {
    // Navigates to the profile page with the name parameter
    window.location.href = `/dash/profile.html?name=${celebName}`;
};

document.addEventListener('DOMContentLoaded', async () => {
    const people = await getDailyCelebs();
    renderCelebs(people);
});