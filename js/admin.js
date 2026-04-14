/**
 * ALIYAH GROUP - Admin complet
 * Actualités / Contacts / Demandes de Devis
 */

var SUPABASE_URL   = 'https://ilycnutphhmuvaonkrsa.supabase.co';
var SUPABASE_KEY   = 'sb_publishable_1O960JacjvpleoB-jTqiag_7Ou-4Y0N';
var ADMIN_PASSWORD = '3065';

var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
var isAuthenticated = false;

// ============================================
// AUTHENTIFICATION
// ============================================
var loginForm   = document.getElementById('loginForm');
var adminPanel  = document.getElementById('adminPanel');
var authForm    = document.getElementById('authForm');
var logoutBtn   = document.getElementById('logoutBtn');
var errorMsg    = document.getElementById('errorMessage');

authForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (document.getElementById('passwordInput').value === ADMIN_PASSWORD) {
        isAuthenticated = true;
        sessionStorage.setItem('admin_auth', 'true');
        showPanel();
    } else {
        errorMsg.textContent = 'Mot de passe incorrect.';
    }
});

logoutBtn.addEventListener('click', function() {
    isAuthenticated = false;
    sessionStorage.removeItem('admin_auth');
    loginForm.style.display = 'block';
    adminPanel.style.display = 'none';
    logoutBtn.style.display = 'none';
    document.getElementById('passwordInput').value = '';
});

if (sessionStorage.getItem('admin_auth') === 'true') {
    showPanel();
}

function showPanel() {
    isAuthenticated = true;
    loginForm.style.display = 'none';
    adminPanel.style.display = 'block';
    logoutBtn.style.display = 'inline-block';
    loadActualites();
    loadContacts();
    loadDevis();
}

// ============================================
// ONGLETS
// ============================================
document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var tab = this.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
        this.classList.add('active');
        document.getElementById('tab-' + tab).classList.add('active');
    });
});

// ============================================
// ACTUALITÉS
// ============================================
var actualiteForm    = document.getElementById('actualiteForm');
var statusActualite  = document.getElementById('statusActualite');

actualiteForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!isAuthenticated) return;

    var btn = this.querySelector('[type="submit"]');
    btn.disabled = true;
    statusActualite.textContent = 'Publication en cours...';
    statusActualite.style.color = '#666';

    var photoFile = document.getElementById('photoInput').files[0];
    var videoFile = document.getElementById('videoInput').files[0];
    var photoUrl  = null;
    var videoUrl  = null;

    try {
        if (photoFile) {
            var photoPath = 'photos/' + Date.now() + '_' + photoFile.name;
            var { error: pe } = await sb.storage.from('aliyah-media').upload(photoPath, photoFile);
            if (pe) throw pe;
            photoUrl = sb.storage.from('aliyah-media').getPublicUrl(photoPath).data.publicUrl;
        }
        if (videoFile) {
            var videoPath = 'videos/' + Date.now() + '_' + videoFile.name;
            var { error: ve } = await sb.storage.from('aliyah-media').upload(videoPath, videoFile);
            if (ve) throw ve;
            videoUrl = sb.storage.from('aliyah-media').getPublicUrl(videoPath).data.publicUrl;
        }

        var { error } = await sb.from('aliyah_actualites').insert({
            titre:       document.getElementById('titreInput').value,
            description: document.getElementById('descriptionInput').value,
            type:        document.getElementById('typeInput').value,
            photo_url:   photoUrl,
            video_url:   videoUrl
        });
        if (error) throw error;

        statusActualite.textContent = 'Actualité publiée !';
        statusActualite.style.color = 'green';
        actualiteForm.reset();
        loadActualites();
    } catch (err) {
        statusActualite.textContent = 'Erreur : ' + err.message;
        statusActualite.style.color = 'red';
    } finally {
        btn.disabled = false;
    }
});

async function loadActualites() {
    var list = document.getElementById('actualitesList');
    list.innerHTML = '<p class="loading-text">Chargement...</p>';
    try {
        var { data, error } = await sb.from('aliyah_actualites').select('*').order('date_publication', { ascending: false });
        if (error) throw error;
        renderList(list, data, renderActualite);
    } catch (err) {
        list.innerHTML = '<p class="error-text">Erreur : ' + err.message + '</p>';
    }
}

function renderActualite(item) {
    return '<div class="list-item">' +
        '<div class="item-header">' +
            '<span class="badge-type">' + item.type + '</span>' +
            '<span class="item-date">' + formatDate(item.date_publication) + '</span>' +
            '<button class="btn-delete" onclick="deleteActualite(\'' + item.id + '\')">Supprimer</button>' +
        '</div>' +
        '<h4>' + item.titre + '</h4>' +
        '<p>' + item.description + '</p>' +
        (item.photo_url ? '<img src="' + item.photo_url + '" alt="" class="thumb">' : '') +
    '</div>';
}

async function deleteActualite(id) {
    if (!confirm('Supprimer cette actualité ?')) return;
    await sb.from('aliyah_actualites').delete().eq('id', id);
    loadActualites();
}

// ============================================
// CONTACTS
// ============================================
async function loadContacts() {
    var list = document.getElementById('contactsList');
    if (!list) return;
    list.innerHTML = '<p class="loading-text">Chargement...</p>';
    try {
        var { data, error } = await sb.from('aliyah_contacts').select('*').order('date_envoi', { ascending: false });
        if (error) throw error;

        // Badge non lus
        var nonLus = data.filter(function(c) { return !c.lu; }).length;
        var badge = document.getElementById('badge-contacts');
        if (badge) badge.textContent = nonLus > 0 ? nonLus : '';

        renderList(list, data, renderContact);
    } catch (err) {
        list.innerHTML = '<p class="error-text">Erreur : ' + err.message + '</p>';
    }
}

function renderContact(item) {
    return '<div class="list-item' + (item.lu ? '' : ' unread') + '">' +
        '<div class="item-header">' +
            (item.lu ? '' : '<span class="badge-new">Nouveau</span>') +
            '<span class="item-date">' + formatDate(item.date_envoi) + '</span>' +
            '<div class="item-actions">' +
                (!item.lu ? '<button class="btn-sm btn-secondary" onclick="markContactLu(\'' + item.id + '\')">Marquer lu</button>' : '') +
                '<button class="btn-delete" onclick="deleteContact(\'' + item.id + '\')">Supprimer</button>' +
            '</div>' +
        '</div>' +
        '<h4>' + (item.nom || '') + ' — <a href="mailto:' + item.email + '">' + item.email + '</a></h4>' +
        (item.telephone ? '<p><strong>Tél :</strong> ' + item.telephone + '</p>' : '') +
        (item.service   ? '<p><strong>Service :</strong> ' + item.service + '</p>' : '') +
        (item.objet     ? '<p><strong>Objet :</strong> ' + item.objet + '</p>' : '') +
        '<p class="item-message">' + (item.message || '') + '</p>' +
    '</div>';
}

async function markContactLu(id) {
    await sb.from('aliyah_contacts').update({ lu: true }).eq('id', id);
    loadContacts();
}

async function deleteContact(id) {
    if (!confirm('Supprimer ce message ?')) return;
    await sb.from('aliyah_contacts').delete().eq('id', id);
    loadContacts();
}

// ============================================
// DEVIS
// ============================================
async function loadDevis() {
    var list = document.getElementById('devisList');
    if (!list) return;
    list.innerHTML = '<p class="loading-text">Chargement...</p>';
    try {
        var { data, error } = await sb.from('aliyah_devis').select('*').order('date_envoi', { ascending: false });
        if (error) throw error;

        // Badge nouveaux
        var nouveaux = data.filter(function(d) { return d.statut === 'nouveau'; }).length;
        var badge = document.getElementById('badge-devis');
        if (badge) badge.textContent = nouveaux > 0 ? nouveaux : '';

        renderList(list, data, renderDevis);
    } catch (err) {
        list.innerHTML = '<p class="error-text">Erreur : ' + err.message + '</p>';
    }
}

function renderDevis(item) {
    var statutClass = item.statut === 'nouveau' ? 'badge-new' : (item.statut === 'traité' ? 'badge-done' : 'badge-type');
    return '<div class="list-item' + (item.statut === 'nouveau' ? ' unread' : '') + '">' +
        '<div class="item-header">' +
            '<span class="' + statutClass + '">' + (item.statut || 'nouveau') + '</span>' +
            '<span class="item-date">' + formatDate(item.date_envoi) + '</span>' +
            '<div class="item-actions">' +
                (item.statut !== 'traité' ? '<button class="btn-sm btn-secondary" onclick="updateDevisStatut(\'' + item.id + '\', \'traité\')">Marquer traité</button>' : '') +
                '<button class="btn-delete" onclick="deleteDevis(\'' + item.id + '\')">Supprimer</button>' +
            '</div>' +
        '</div>' +
        '<h4>' + (item.prenom || '') + ' ' + (item.nom || '') + ' — <a href="mailto:' + item.email + '">' + item.email + '</a></h4>' +
        '<p><strong>Tél :</strong> ' + (item.telephone || '—') +
            (item.societe ? ' | <strong>Société :</strong> ' + item.societe : '') + '</p>' +
        '<p><strong>Service :</strong> <em>' + (item.service || '—') + '</em></p>' +
        renderDevisDetails(item) +
        (item.budget  ? '<p><strong>Budget :</strong> ' + item.budget + '</p>' : '') +
        (item.message ? '<p class="item-message"><strong>Message :</strong> ' + item.message + '</p>' : '') +
    '</div>';
}

function renderDevisDetails(item) {
    var s = item.service;
    var html = '';
    if (s === 'fret') {
        html = '<p>' +
            (item.fret_type    ? '<strong>Transport :</strong> ' + item.fret_type + ' ' : '') +
            (item.depart       ? '| <strong>De :</strong> ' + item.depart + ' ' : '') +
            (item.destination  ? '→ ' + item.destination + ' ' : '') +
            (item.poids        ? '| <strong>Poids :</strong> ' + item.poids + ' kg ' : '') +
            (item.volume       ? '| <strong>Vol :</strong> ' + item.volume + ' m³' : '') +
        '</p>';
        if (item.nature_marchandise) html += '<p><strong>Marchandises :</strong> ' + item.nature_marchandise + '</p>';
    } else if (s === 'btp') {
        html = '<p>' +
            (item.btp_type             ? '<strong>Type :</strong> ' + item.btp_type + ' ' : '') +
            (item.localisation_projet  ? '| <strong>Lieu :</strong> ' + item.localisation_projet + ' ' : '') +
            (item.surface              ? '| <strong>Surface :</strong> ' + item.surface + ' m² ' : '') +
            (item.delai_souhaite       ? '| <strong>Délai :</strong> ' + item.delai_souhaite : '') +
        '</p>';
    } else if (s === 'location-residence') {
        html = '<p>' +
            (item.date_debut_residence ? '<strong>Début :</strong> ' + item.date_debut_residence + ' ' : '') +
            (item.duree_sejour         ? '| <strong>Durée :</strong> ' + item.duree_sejour + ' ' : '') +
            (item.nb_chambres          ? '| <strong>Chambres :</strong> ' + item.nb_chambres + ' ' : '') +
            (item.nb_personnes         ? '| <strong>Personnes :</strong> ' + item.nb_personnes + ' ' : '') +
            (item.quartier_prefere     ? '| <strong>Quartier :</strong> ' + item.quartier_prefere : '') +
        '</p>';
    } else if (s === 'location-vehicule') {
        html = '<p>' +
            (item.date_debut_vehicule ? '<strong>Du :</strong> ' + item.date_debut_vehicule + ' ' : '') +
            (item.date_fin_vehicule   ? '→ ' + item.date_fin_vehicule + ' ' : '') +
            (item.type_vehicule       ? '| <strong>Véhicule :</strong> ' + item.type_vehicule + ' ' : '') +
            (item.avec_chauffeur      ? '| <strong>Chauffeur :</strong> ' + item.avec_chauffeur : '') +
        '</p>';
    }
    return html;
}

async function updateDevisStatut(id, statut) {
    await sb.from('aliyah_devis').update({ statut: statut }).eq('id', id);
    loadDevis();
}

async function deleteDevis(id) {
    if (!confirm('Supprimer cette demande de devis ?')) return;
    await sb.from('aliyah_devis').delete().eq('id', id);
    loadDevis();
}

// ============================================
// UTILITAIRES
// ============================================
function renderList(container, data, renderFn) {
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="empty-text">Aucun élément.</p>';
        return;
    }
    container.innerHTML = data.map(renderFn).join('');
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}
