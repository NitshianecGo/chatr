import {
  doc,
  setDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
  arrayUnion,
  getDoc,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'

// Детерминированный id для личного чата 1-на-1: всегда одинаковый
// для пары пользователей независимо от того, кто первый написал.
export function directChatId(uidA, uidB) {
  return [uidA, uidB].sort().join('_')
}

export async function getOrCreateDirectChat(me, other) {
  const chatId = directChatId(me.uid, other.uid)
  const ref = doc(db, 'chats', chatId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      isGroup: false,
      participants: [me.uid, other.uid],
      participantsInfo: {
        [me.uid]: { username: me.username, colorFrom: me.colorFrom, colorTo: me.colorTo },
        [other.uid]: { username: other.username, colorFrom: other.colorFrom, colorTo: other.colorTo },
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null,
    })
  }
  return chatId
}

export async function createGroupChat(me, members, groupName) {
  const participants = [me.uid, ...members.map((m) => m.uid)]
  const participantsInfo = { [me.uid]: { username: me.username, colorFrom: me.colorFrom, colorTo: me.colorTo } }
  members.forEach((m) => {
    participantsInfo[m.uid] = { username: m.username, colorFrom: m.colorFrom, colorTo: m.colorTo }
  })
  const docRef = await addDoc(collection(db, 'chats'), {
    isGroup: true,
    groupName,
    participants,
    participantsInfo,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: null,
  })
  return docRef.id
}

export async function sendTextMessage(chatId, sender, text) {
  const trimmed = text.trim()
  if (!trimmed) return
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderId: sender.uid,
    senderName: sender.username,
    type: 'text',
    text: trimmed,
    createdAt: serverTimestamp(),
    readBy: [sender.uid],
  })
  await updateDoc(doc(db, 'chats', chatId), {
    updatedAt: serverTimestamp(),
    lastMessage: { text: trimmed, senderId: sender.uid, type: 'text', createdAt: serverTimestamp() },
  })
}

export async function sendImageMessage(chatId, sender, file) {
  const path = `chatImages/${chatId}/${Date.now()}_${file.name}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)

  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderId: sender.uid,
    senderName: sender.username,
    type: 'image',
    imageUrl: url,
    createdAt: serverTimestamp(),
    readBy: [sender.uid],
  })
  await updateDoc(doc(db, 'chats', chatId), {
    updatedAt: serverTimestamp(),
    lastMessage: { text: '📷 Фото', senderId: sender.uid, type: 'image', createdAt: serverTimestamp() },
  })
}

export async function setTyping(chatId, uid, isTyping) {
  await setDoc(
    doc(db, 'chats', chatId, 'typing', uid),
    { isTyping, updatedAt: serverTimestamp() },
    { merge: true }
  )
}

export async function markMessageRead(chatId, messageId, uid) {
  await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
    readBy: arrayUnion(uid),
  })
}
