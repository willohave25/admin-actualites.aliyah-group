/**
 * ALIYAH GROUP - Interface Admin Actualités
 * Gestion des publications via Supabase
 */

const SUPABASE_URL = 'https://ilycnutphhmuvaonkrsa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1O960JacjvpleoB-jTqiag_7Ou-4Y0N';
const ADMIN_PASSWORD = '3065';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isAuthenticated = false;

// Éléments DOM
const loginForm = document.getElementById('loginForm');
const adminPanel = document.getElementById('adminPanel');
const authForm = document.getElementById('authForm');
const passwordInput = document.getElementById('passwordInput');
const errorMessage = document.getElementById('errorMessage');
const logoutBtn = document.getElementById('logoutBtn');
const actualiteForm = document.getElementById('actualiteForm');
const actualitesList = document.getElementById('actualitesList');
const statusMessage = document.getElementById('statusMessage');

// Connexion
authForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const password = passwordInput.value;

    if (password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        sessionStorage.setItem('admin_auth', 'true');
        showAdminPanel();
        loadActualites();
    } else {
        errorMessage.textContent = 'Mot de passe incorrect.';
    }
});

// Déconnexion
logoutBtn.addEventListener('click', function() {
    isAuthenticated = false;
    sessionStorage.removeItem('admin_auth');
    loginForm.style.display = 'block';
    adminPanel.style.display = 'none';
    passwordInput.value = '';
});

// Vérifier l'authentification au chargement
if (sessionStorage.getItem('admin_auth') === 'true') {
    showAdminPanel();
    loadActualites();
}

function showAdminPanel() {
    loginForm.style.display = 'none';
    adminPanel.style.display = 'block';
    logoutBtn.style.display = 'inline-block';
}

// Publier une actualité
actualiteForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!isAuthenticated) return;

    const submitBtn = actualiteForm.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    statusMessage.textContent = 'Publication en cours...';
    statusMessage.style.color = '#666';

    const titre = document.getElementById('titreInput').value;
    const description = document.getElementById('descriptionInput').value;
    const type = document.getElementById('typeInput').value;
    const photoFile = document.getElementById('photoInput').files[0];
    const videoFile = document.getElementById('videoInput').files[0];

    let photoUrl = null;
    let videoUrl = null;

    try {
        // Upload photo si présente
        if (photoFile) {
            const photoPath = 'photos/' + Date.now() + '_' + photoFile.name;
            const { error: photoError } = await supabase.storage
                .from('actualites-media')
                .upload(photoPath, photoFile);

            if (photoError) throw photoError;

            const { data: { publicUrl } } = supabase.storage
                .from('actualites-media')
                .getPublicUrl(photoPath);

            photoUrl = publicUrl;
        }

        // Upload vidéo si présente
        if (videoFile) {
            const videoPath = 'videos/' + Date.now() + '_' + videoFile.name;
            const { error: videoError } = await supabase.storage
                .from('actualites-media')
                .upload(videoPath, videoFile);

            if (videoError) throw videoError;

            const { data: { publicUrl } } = supabase.storage
                .from('actualites-media')
                .getPublicUrl(videoPath);

            videoUrl = publicUrl;
        }

        // Insérer l'actualité
        const { error } = await supabase
            .from('actualites')
            .insert({
                titre: titre,
                description: description,
                type: type,
                photo_url: photoUrl,
                video_url: videoUrl
            });

        if (error) throw error;

        statusMessage.textContent = 'Actualité publiée avec succès !';
        statusMessage.style.color = 'green';
        actualiteForm.reset();
        loadActualites();

    } catch (error) {
        console.error('Erreur:', error);
        statusMessage.textContent = 'Erreur : ' + error.message;
        statusMessage.style.color = 'red';
    } finally {
        submitBtn.disabled = false;
    }
});

// Charger la liste des actualités
async function loadActualites() {
    actualitesList.innerHTML = '<p>Chargement...</p>';

    try {
        const { data, error } = await supabase
            .from('actualites')
            .select('*')
            .order('date_publication', { ascending: false });

        if (error) throw error;

        actualitesList.innerHTML = '';

        if (!data || data.length === 0) {
            actualitesList.innerHTML = '<p>Aucune actualité publiée.</p>';
            return;
        }

        data.forEach(function(actualite) {
            const item = document.createElement('div');
            item.className = 'actualite-item';
            item.innerHTML =
                '<div class="actualite-header">' +
                    '<span class="actualite-type">' + actualite.type + '</span>' +
                    '<span class="actualite-date">' + new Date(actualite.date_publication).toLocaleDateString('fr-FR') + '</span>' +
                '</div>' +
                '<h4>' + actualite.titre + '</h4>' +
                '<p>' + actualite.description + '</p>' +
                (actualite.photo_url ? '<img src="' + actualite.photo_url + '" alt="" style="max-width: 200px; margin: 8px 0; display: block;">' : '') +
                '<button onclick="deleteActualite(\'' + actualite.id + '\')" class="btn-delete">Supprimer</button>';
            actualitesList.appendChild(item);
        });

    } catch (error) {
        console.error('Erreur chargement:', error);
        actualitesList.innerHTML = '<p style="color:red">Erreur de chargement.</p>';
    }
}

// Supprimer une actualité
async function deleteActualite(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette actualité ?')) return;

    try {
        const { error } = await supabase
            .from('actualites')
            .delete()
            .eq('id', id);

        if (error) throw error;

        loadActualites();

    } catch (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur lors de la suppression.');
    }
}
