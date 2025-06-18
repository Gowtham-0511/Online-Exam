import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export type UserRole = "attender" | "examiner" | "admin";

export const createOrFetchUser = async (email: string, name: string | null) => {
    const userRef = doc(db, "users", email);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
        await setDoc(userRef, {
            email,
            name,
            role: "attender",
        });
        return { role: "attender" };
    } else {
        return docSnap.data() as { role: UserRole };
    }
};
