import React from 'react';
import { Briefcase, Bell, LayoutDashboard, UserCheck, Loader2, AlertTriangle } from 'lucide-react';
import { useGrist } from './hooks/useGrist';

export default function App() {
    const { isReady, currentUser, error, setMockUser } = useGrist();

    // Styles globaux (ADN DSFR)
    const styles = {
        app: { fontFamily: '"Marianne", arial, sans-serif', backgroundColor: 'var(--background-alt-grey, #f6f6f6)', minHeight: '100vh', color: 'var(--text-default-grey, #161616)', display: 'flex', flexDirection: 'column' },
        header: { backgroundColor: '#fff', borderBottom: '1px solid #e5e5e5', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' },
        headerTitle: { margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--background-action-high-blue-france, #000091)', display: 'flex', alignItems: 'center', gap: '12px' },
        profileBubble: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--background-action-high-blue-france, #000091)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', border: '2px solid transparent', transition: 'border 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
        main: { flexGrow: 1, padding: '32px 24px', maxWidth: '1400px', margin: '0 auto', width: '100%' },
        card: { backgroundColor: '#fff', padding: '24px', borderTop: '4px solid var(--background-action-high-blue-france, #000091)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
        devSwitcher: { backgroundColor: '#ffe9e9', padding: '8px', textAlign: 'center', fontSize: '0.85rem', borderBottom: '1px solid #ce0500', color: '#ce0500' }
    };

    // 1. État : Erreur
    if (error) return (
        <div style={{...styles.app, alignItems: 'center', justifyContent: 'center'}}>
            <div style={{...styles.card, borderTopColor: '#ce0500', textAlign: 'center'}}>
                <AlertTriangle size={48} color="#ce0500" style={{marginBottom: '16px'}}/>
                <h2>Erreur Système</h2>
                <p>{error}</p>
            </div>
        </div>
    );

    // 2. État : Chargement
    if (!isReady || !currentUser) return (
        <div style={{...styles.app, alignItems: 'center', justifyContent: 'center'}}>
            <Loader2 size={48} color="#000091" style={{ animation: 'spin 2s linear infinite' }} />
            <p style={{marginTop: '16px', fontWeight: 'bold', color: '#000091'}}>Initialisation du portail...</p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    // 3. État : Prêt (Routage par Rôle)
    const isChef = currentUser.Fonction?.toLowerCase().includes('chef');

    return (
        <div style={styles.app}>
            {/* DEV TOOL : Switcher de Rôle (Invisible sur Grist) */}
            {!window.grist && (
                <div style={styles.devSwitcher}>
                    🛠 <b>Mode Dev Local :</b> Changer de vue 
                    <button onClick={() => setMockUser('chef')} style={{marginLeft: '12px', padding: '4px 8px'}}>Vue Chef</button>
                    <button onClick={() => setMockUser('agent')} style={{marginLeft: '8px', padding: '4px 8px'}}>Vue Agent</button>
                </div>
            )}

            {/* HEADER COMMUN */}
            <header style={styles.header}>
                <div style={styles.headerTitle}>
                    <Briefcase size={24} />
                    Portail UD — {currentUser.Sub || "Non assigné"}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{currentUser.Prenom} {currentUser.NOM}</div>
                        <div style={{ color: '#666', fontSize: '0.8rem' }}>{currentUser.Fonction}</div>
                    </div>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', position: 'relative' }}>
                        <Bell size={24} />
                        <span style={{ position: 'absolute', top: 0, right: 0, width: '10px', height: '10px', backgroundColor: '#ce0500', borderRadius: '50%', border: '2px solid #fff' }}></span>
                    </button>
                    <div style={styles.profileBubble} title="Ouvrir la carte profil">
                        {currentUser.Initiales || "???"}
                    </div>
                </div>
            </header>

            {/* ROUTAGE DE L'ESPACE PRINCIPAL */}
            <main style={styles.main}>
                {isChef ? (
                    <div style={styles.card}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
                            <LayoutDashboard color="#000091" /> Espace Pilotage & Attribution
                        </h2>
                        <p>Ici viendra le tableau de bord des courriers en attente pour la {currentUser.Sub} et l'indicateur de charge de l'équipe.</p>
                    </div>
                ) : (
                    <div style={styles.card}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
                            <UserCheck color="#000091" /> Espace Focus Agent
                        </h2>
                        <p>Ici viendra la liste priorisée des courriers attribués à {currentUser.Prenom}.</p>
                    </div>
                )}
            </main>
        </div>
    );
}