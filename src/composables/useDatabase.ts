import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Clip, PublishPlan } from '@/types';

interface PodcastDB extends DBSchema {
  clips: {
    key: string;
    value: Clip;
    indexes: {
      topic: string;
      speaker: string;
      riskLevel: string;
      publishStatus: string;
      sortOrder: number;
    };
  };
  plans: {
    key: string;
    value: PublishPlan;
    indexes: {
      status: string;
      updatedAt: string;
    };
  };
}

const DB_NAME = 'PodcastClipDB';
const DB_VERSION = 2;
const STORE_CLIPS = 'clips';
const STORE_PLANS = 'plans';

let dbPromise: Promise<IDBPDatabase<PodcastDB>> | null = null;

function getDB(): Promise<IDBPDatabase<PodcastDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PodcastDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_CLIPS)) {
          const store = db.createObjectStore(STORE_CLIPS, { keyPath: 'id' });
          store.createIndex('topic', 'topic');
          store.createIndex('speaker', 'speaker');
          store.createIndex('riskLevel', 'riskLevel');
          store.createIndex('publishStatus', 'publishStatus');
          store.createIndex('sortOrder', 'sortOrder');
        }
        if (!db.objectStoreNames.contains(STORE_PLANS)) {
          const planStore = db.createObjectStore(STORE_PLANS, { keyPath: 'id' });
          planStore.createIndex('status', 'status');
          planStore.createIndex('updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllClips(): Promise<Clip[]> {
  const db = await getDB();
  const clips = await db.getAllFromIndex(STORE_CLIPS, 'sortOrder');
  return clips;
}

export async function getClipById(id: string): Promise<Clip | undefined> {
  const db = await getDB();
  return await db.get(STORE_CLIPS, id);
}

export async function addClip(clip: Clip): Promise<string> {
  const db = await getDB();
  return await db.add(STORE_CLIPS, clip);
}

export async function updateClip(clip: Clip): Promise<string> {
  const db = await getDB();
  return await db.put(STORE_CLIPS, clip);
}

export async function updateClipsBulk(clips: Clip[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_CLIPS, 'readwrite');
  await Promise.all([
    ...clips.map(clip => tx.store.put(clip)),
    tx.done,
  ]);
}

export async function deleteClip(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_CLIPS, id);
}

export async function deleteClipsBulk(ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_CLIPS, 'readwrite');
  await Promise.all([
    ...ids.map(id => tx.store.delete(id)),
    tx.done,
  ]);
}

export async function clearAllClips(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_CLIPS);
}

export async function getAllPlans(): Promise<PublishPlan[]> {
  const db = await getDB();
  const plans = await db.getAllFromIndex(STORE_PLANS, 'updatedAt');
  return plans.reverse();
}

export async function getPlanById(id: string): Promise<PublishPlan | undefined> {
  const db = await getDB();
  return await db.get(STORE_PLANS, id);
}

export async function addPlan(plan: PublishPlan): Promise<string> {
  const db = await getDB();
  return await db.add(STORE_PLANS, plan);
}

export async function updatePlan(plan: PublishPlan): Promise<string> {
  const db = await getDB();
  return await db.put(STORE_PLANS, plan);
}

export async function deletePlan(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_PLANS, id);
}
