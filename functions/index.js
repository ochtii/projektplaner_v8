// location: functions/index.js

// Nur die benötigten Module importieren
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// "setAdmin" ist eine aufrufbare Cloud Function.
exports.setAdmin = functions.https.onCall(async (data, context) => {
  // 1. Prüfen, ob der aufrufende Benutzer bereits Admin-Rechte hat.
  // Dies ist eine wichtige Sicherheitsüberprüfung.
  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
        "permission-denied",
        "Dieser Befehl erfordert Administratorrechte.",
    );
  }

  const email = data.email;
  if (!email) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Die E-Mail-Adresse fehlt im Aufruf.",
    );
  }

  try {
    // 2. Benutzer über die E-Mail-Adresse in Firebase Authentication finden.
    const userRecord = await admin.auth().getUserByEmail(email);
    const userId = userRecord.uid;

    // 3. Dem Benutzer Admin-Rechte über Custom Claims geben. (Formatierung korrigiert)
    await admin.auth().setCustomUserClaims(userId, {admin: true});

    // 4. Zusätzlich das 'isAdmin'-Flag im Firestore-Dokument des Benutzers setzen. (Formatierung korrigiert)
    const db = admin.firestore();
    await db.collection("users").doc(userId).set({isAdmin: true}, {merge: true});

    return {
      message: `Erfolg! ${email} wurde zum Administrator ernannt.`,
    };
  } catch (error) {
    console.error("Fehler beim Ernennen des Admins:", error);
    // Gibt einen detaillierten Fehler an den aufrufenden Client zurück.
    throw new functions.https.HttpsError(
        "internal",
        "Ein interner Fehler ist aufgetreten: " + error.message,
    );
  }
});