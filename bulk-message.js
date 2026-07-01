const axios = require('axios');

// ==========================================
// BULK MESSAGE CONFIGURATION
// ==========================================

// 1. Add your API Key here (from the dashboard or .env API_MASTER_KEY)
const API_KEY = 'owa_k1_c0afde92f749ae19ef6d0968e968b85de803522e3b81f7156d2d0762683f10f9';

// 2. Add your Session ID here (create this in the dashboard)
const SESSION_ID = 'YOUR_SESSION_ID_HERE';

// 3. Add your Contact Numbers here
// Note: WhatsApp uses international format, typically ending with @c.us for individuals
// Example: "628123456789@c.us"
const CONTACT_NUMBERS = [
  "1234567890@c.us",
  "0987654321@c.us",
  // Add more numbers here
];

// 4. Set the message you want to send
const MESSAGE_TEXT = "Hello! This is a bulk message sent via OpenWA.";

// ==========================================

async function sendBulkMessages() {
  console.log(`Starting bulk message script. Sending to ${CONTACT_NUMBERS.length} contacts...`);

  for (const contact of CONTACT_NUMBERS) {
    try {
      console.log(`Sending to ${contact}...`);
      const response = await axios.post(
        `http://localhost:2785/api/sessions/${SESSION_ID}/messages/send-text`,
        {
          chatId: contact,
          text: MESSAGE_TEXT
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
          }
        }
      );
      
      console.log(`✅ Success for ${contact}:`, response.data);
      
      // Optional: Add a delay to avoid rate limiting from WhatsApp
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Failed to send to ${contact}:`, error.response ? error.response.data : error.message);
    }
  }
  
  console.log("Bulk messaging completed.");
}

sendBulkMessages();
