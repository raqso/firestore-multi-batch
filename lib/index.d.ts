import { firestore } from "firebase-admin";
export declare class MultiBatch implements Batchable {
    dbRef: firestore.Firestore;
    batches: firestore.WriteBatch[];
    currentBatch: firestore.WriteBatch;
    currentBatchOpCount: number;
    totalOperations: number;
    committed: boolean;
    constructor(dbRef: firestore.Firestore);
    set(documentRef: firestore.DocumentReference<any>, data: firestore.UpdateData, options?: FirebaseFirestore.SetOptions): firestore.WriteBatch;
    delete(documentRef: firestore.DocumentReference<any>): firestore.WriteBatch;
    update(documentRef: firestore.DocumentReference<any>, changesObj: firestore.UpdateData): firestore.WriteBatch;
    commit(): Promise<void>;
    private setBatch;
}
interface Batchable {
    set: firestore.WriteBatch["set"];
    delete: firestore.WriteBatch["delete"];
    update: (documentRef: firestore.DocumentReference<any>, data: firestore.UpdateData) => firestore.WriteBatch;
}
export {};
