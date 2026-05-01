import { useState, useEffect, useRef } from 'react';

// --- FAUSSES DONNÉES POUR LE DÉVELOPPEMENT LOCAL (npm run dev) ---
const MOCK_AGENTS = [
    { id: 1, Email: "chef.sub@developpement-durable.gouv.fr", NOM: "Dupont", Prenom: "Jean", Fonction: "Chef de subdivision", Sub: "Sub Est", Initiales: "JD", Preferences: "{}" },
    { id: 2, Email: "agent.terrain@developpement-durable.gouv.fr", NOM: "Martin", Prenom: "Sophie", Fonction: "Agent", Sub: "Sub Est", Initiales: "SM", Preferences: "{}" }
];

const MOCK_COURRIERS = [
    { id: 101, Chrono: "260001", Objet: "Dossier ICPE Usine X", Sub_Suggeree: "Sub Est", Agents: [], Date_Limite: Date.now() / 1000 + 86400 * 5 },
    { id: 102, Chrono: "260002", Objet: "Plainte nuisances sonores", Sub_Suggeree: "Sub Est", Agents: [2], Date_Limite: Date.now() / 1000 + 86400 * 2 }
];

export function useGrist() {
    const [isReady, setIsReady] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [courriers, setCourriers] = useState([]);
    const [agents, setAgents] = useState([]);
    const [error, setError] = useState(null);
    
    // Empêche la double exécution du mode strict de React
    const authInitiee = useRef(false);

    // Mode développeur : pour simuler le changement d'utilisateur en local
    const setMockUser = (role) => {
        setCurrentUser(role === 'chef' ? MOCK_AGENTS[0] : MOCK_AGENTS[1]);
    };

    /* --- UTILITAIRES --- */
    const formatTable = (data) => {
        if (!data || !data.id) return [];
        return data.id.map((id, index) => {
            const row = { id };
            for (const key in data) {
                if (key !== 'id') row[key] = data[key][index];
            }
            return row;
        });
    };

    /* --- MOTEUR D'IDENTIFICATION --- */
    const identifierAgent = async (agentsData) => {
        let newLogId = null;
        try {
            // 1. Vérification du cache de session
            const sessionCache = sessionStorage.getItem('portail_agent_session_v1');
            if (sessionCache) {
                setCurrentUser(JSON.parse(sessionCache));
                return;
            }

            // 2. Création du jeton unique (Action en base)
            const token = crypto.randomUUID();
            const addedIds = await window.grist.docApi.applyUserActions([['AddRecord', 'Session_Logs', null, { Token: token }]]);
            newLogId = addedIds[0];

            let emailAgent = null;
            let tentatives = 0;

            // 3. Boucle d'interrogation
            while (!emailAgent && tentatives < 6) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // On télécharge la table (sans tenter de filtrer côté serveur)
                const records = await window.grist.docApi.fetchTable('Session_Logs');
                
                if (records && records.Token) {
                    // CORRECTION DU BUG : On cherche l'index exact de NOTRE jeton
                    const tokenIndex = records.Token.indexOf(token);
                    
                    if (tokenIndex !== -1 && records.Email_Agent && records.Email_Agent[tokenIndex]) {
                        const mail = records.Email_Agent[tokenIndex];
                        if (typeof mail === 'string' && mail.includes('@')) {
                            emailAgent = mail;
                        }
                    }
                }
                tentatives++;
                console.log(`[AUTH] Ping ${tentatives}/6...`);
            }

            // 4. Croisement avec l'annuaire
            if (emailAgent) {
                const emailClean = emailAgent.trim().toLowerCase();
                const agentCorrespondant = agentsData.find(a => a.Email?.toLowerCase() === emailClean);

                if (agentCorrespondant) {
                    // Construction du profil purifié
                    const userObj = {
                        id: agentCorrespondant.id,
                        nom: agentCorrespondant.NOM,
                        prenom: agentCorrespondant.Prenom,
                        email: agentCorrespondant.Email,
                        initiales: agentCorrespondant.Initiales || "??",
                        fonction: agentCorrespondant.Fonction,
                        sub: agentCorrespondant.Sub,
                        preferences: agentCorrespondant.Preferences || "{}"
                    };
                    setCurrentUser(userObj);
                    sessionStorage.setItem('portail_agent_session_v1', JSON.stringify(userObj));
                } else {
                    setError("Accès refusé : Votre email n'est pas reconnu dans l'annuaire de l'UD.");
                }
            } else {
                setError("Délai d'attente dépassé pour l'identification sécurisée.");
            }
        } catch (e) {
            console.error("[AUTH] Erreur critique :", e);
            setError("Erreur lors de la vérification de l'identité.");
        } finally {
            // 5. Nettoyage silencieux de la trace
            if (newLogId) {
                try {
                    await window.grist.docApi.applyUserActions([['RemoveRecord', 'Session_Logs', newLogId]]);
                } catch (err) { console.warn("Nettoyage du log de session impossible"); }
            }
        }
    };

    /* --- INITIALISATION --- */
    useEffect(() => {
        const initGrist = async () => {
            try {
                if (!window.grist) {
                    console.warn("⚠️ Mode Développement Local : API Grist absente.");
                    setAgents(MOCK_AGENTS);
                    setCourriers(MOCK_COURRIERS);
                    setCurrentUser(MOCK_AGENTS[1]); // Agent par défaut
                    setIsReady(true);
                    return;
                }

                window.grist.ready({ requiredAccess: 'full' });

                // Chargement des données métier
                const [resC, resAg] = await Promise.all([
                    window.grist.docApi.fetchTable('Courriers_Entrants'),
                    window.grist.docApi.fetchTable('Creator_AgentsUD28')
                ]);

                const agentsData = formatTable(resAg);
                setCourriers(formatTable(resC));
                setAgents(agentsData);

                // Lancement de l'identification au premier rendu
                if (!authInitiee.current) {
                    authInitiee.current = true;
                    await identifierAgent(agentsData);
                }

                setIsReady(true);
            } catch (err) {
                console.error("Erreur d'initialisation Grist:", err);
                setError("Échec de connexion à la base de données.");
            }
        };

        initGrist();
    }, []);

    return { isReady, currentUser, courriers, agents, error, setMockUser };
}