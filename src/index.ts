import { firestore } from "firebase-admin";
import asyncPool from "tiny-async-pool";

const OPERATIONS_LIMIT = 500;
const MAX_CONCURRENT_BATCHES = 3;

const dummyFn = () => {};
const cunsole =
	process.env.DEBUG === "true"
		? console
		: {
				log: dummyFn,
				error: dummyFn,
				time: dummyFn,
				timeEnd: dummyFn,
		  };
export class MultiBatch implements Batchable {
	dbRef: firestore.Firestore;
	batches: firestore.WriteBatch[];
	currentBatch: firestore.WriteBatch;
	currentBatchOpCount: number;
	totalOperations: number;
	committed: boolean;

	constructor(dbRef: firestore.Firestore) {
		this.dbRef = dbRef;
		this.batches = [this.dbRef.batch()];
		this.currentBatch = this.batches[0];
		this.currentBatchOpCount = 0;
		this.totalOperations = 0;
		this.committed = false;
	}

	set(
		documentRef: firestore.DocumentReference<any>,
		data: firestore.UpdateData,
		options?: firestore.SetOptions
	) {
		this.setBatch();
		if (options) {
			this.currentBatch.set(documentRef, data, options);
		} else {
			this.currentBatch.set(documentRef, data);
		}

		return this.currentBatch;
	}

	delete(documentRef: firestore.DocumentReference<any>) {
		this.setBatch();
		this.currentBatch.delete(documentRef);

		return this.currentBatch;
	}

	update(
		documentRef: firestore.DocumentReference<any>,
		changesObj: firestore.UpdateData
	) {
		this.setBatch();
		this.currentBatch.update(documentRef, changesObj);

		return this.currentBatch;
	}

	async commit() {
		this.committed = true;
		const batches = this.batches.map((batch, index) => ({
			batch,
			index,
		}));

		cunsole.log(`Created ${this.batches.length} batches`);
		cunsole.time("All batches commited");
		cunsole.log("\n");

		await asyncPool(MAX_CONCURRENT_BATCHES, batches, async (batch) => {
			const batchNo = `#${batch.index + 1}`;

			cunsole.log(`${batchNo} batch added to be commited`);
			cunsole.time(`${batchNo} batch commited`);

			try {
				await batch.batch.commit();
				cunsole.timeEnd(`${batchNo} batch commited`);
			} catch (error) {
				cunsole.log(`Commiting ${batchNo} batch failed`);
				cunsole.error(error);
			}
		});

		cunsole.log("\n");
		cunsole.timeEnd("All batches commited");
	}

	private setBatch() {
		if (this.committed) throw new Error("MultiBatch already committed.");
		if (this.currentBatchOpCount + 1 > OPERATIONS_LIMIT) {
			this.currentBatch = this.dbRef.batch();
			this.currentBatchOpCount = 0;
			this.batches.push(this.currentBatch);
		}
		this.currentBatchOpCount++;
		this.totalOperations++;
	}
}

interface Batchable {
	set: firestore.WriteBatch["set"];
	delete: firestore.WriteBatch["delete"];
	update: (
		documentRef: firestore.DocumentReference<any>,
		data: firestore.UpdateData
	) => firestore.WriteBatch;
}
