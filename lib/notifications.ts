import Message from './models/Message';

export async function sendSystemMessage(userId: string, text: string) {
  try {
    const message = await Message.create({
      senderId: 'system',
      receiverId: userId,
      text,
      type: 'system',
    });

    return message;
  } catch (error) {
    console.error('Failed to send system message:', error);
  }
}
