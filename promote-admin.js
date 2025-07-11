// location: promote-admin.js

// Dieses Skript benötigt die Firebase Admin SDK.
// Führen Sie `npm install firebase-admin` im Hauptverzeichnis aus, falls noch nicht geschehen.
const admin = require("firebase-admin");

// Lädt die Admin-Schlüssel aus der JSON-Datei.
const serviceAccount = require("./firebase-credentials.json");

// Initialisiert die App mit den Rechten des Service-Accounts.
// Dies ist notwendig, damit das Skript als "Admin" agieren kann.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Liest die E-Mail-Adresse aus den Kommandozeilen-Argumenten.
const emailToPromote = process.argv[2];

if (!emailToPromote) {
  console.error("FEHLER: Bitte geben Sie eine E-Mail-Adresse als Argument an.");
  console.log("Verwendung: node promote-admin.js user@example.com");
  process.exit(1);
}

async function promoteUser() {
  try {
    console.log(`Versuche, '${emailToPromote}' zum Admin zu ernennen...`);

    // Finde den Benutzer, um seine UID zu erhalten.
    const userRecord = await admin.auth().getUserByEmail(emailToPromote);
    const userId = userRecord.uid;

    // Setze die Admin-Rechte direkt über das Admin-SDK.
    await admin.auth().setCustomUserClaims(userId, {admin: true});
    await admin.firestore().collection("users").doc(userId).set({isAdmin: true}, {merge: true});

    console.log(`\nERFOLG: ${emailToPromote} (UID: ${userId}) ist jetzt ein Administrator.`);
  } catch (error) {
    console.error("\nFEHLER: Der Vorgang konnte nicht abgeschlossen werden.");
    console.error(error.message);
  }
  // Beendet den Prozess, damit das Skript nicht hängen bleibt.
  process.exit(0);
}

promoteUser();