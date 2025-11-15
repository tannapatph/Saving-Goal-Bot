// index.js
// Simple LINE Bot (ไม่ใช้ AI) ตอบข้อความแบบง่าย ๆ
require("dotenv").config();
const express = require("express");
const line = require("@line/bot-sdk");

// ใส่ค่า secret / token ของคุณลงไปตรงนี้ (อย่าเอาไปโพสต์ที่สาธารณะนะ)
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();

// route ทดสอบธรรมดา
app.get("/", (req, res) => {
  res.send("Saving Goal Bot is running.");
});

// webhook สำหรับรับ event จาก LINE
app.post("/webhook", line.middleware(config), async (req, res) => {
  const events = req.body.events;

  try {
    const results = await Promise.all(events.map(handleEvent));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

const client = new line.Client(config);

async function handleEvent(event) {
  // ถ้าไม่ใช่ข้อความ ก็ไม่ต้องตอบ
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const userText = (event.message.text || "").trim();

  // ถ้าพิมพ์สวัสดี / hi ให้ตอบทักทาย
  if (userText.includes("สวัสดี") || userText.toLowerCase().includes("hello")) {
    const replyText =
      "สวัสดีจาก Saving Goal Bot 👋\n\n" +
      "ตัวอย่างการใช้งาน:\n" +
      "พิมพ์ว่า\n" +
      "เป้า 30000 มีแล้ว 5000 ภายใน 8 เดือน\n\n" +
      "แล้วบอทจะช่วยคำนวณให้ว่า ต้องเก็บเดือนละเท่าไหร่ 😊";
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: replyText,
    });
  }

  // ลองดึงตัวเลขจากข้อความรูปแบบ "เป้า X มีแล้ว Y ภายใน Z เดือน"
  const pattern =
    /เป้า\s*([\d,\.]+)\s*มีแล้ว\s*([\d,\.]+)\s*ภายใน\s*([\d,\.]+)\s*เดือน/;

  const match = userText.match(pattern);

  if (match) {
    // แปลงข้อความเป็นตัวเลข
    const target = Number(match[1].replace(/[,]/g, ""));
    const current = Number(match[2].replace(/[,]/g, ""));
    const months = Number(match[3].replace(/[,]/g, ""));

    if (!target || !months || isNaN(target) || isNaN(current) || isNaN(months)) {
      const replyText =
        "ขออภัย บอทอ่านตัวเลขไม่ค่อยออก 😅\n" +
        "ลองพิมพ์ใหม่ในรูปแบบนี้นะ\n" +
        "เป้า 30000 มีแล้ว 5000 ภายใน 8 เดือน";
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: replyText,
      });
    }

    const remaining = Math.max(target - current, 0);

    if (remaining === 0) {
      const replyText =
        `ยินดีด้วย! 🎉\n` +
        `ตอนนี้คุณมีเงินครบ ${target.toLocaleString()} บาทแล้ว\n` +
        `ถึงเป้าหมายเรียบร้อย ไม่ต้องเก็บเพิ่มแล้วจ้า 🥳`;
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: replyText,
      });
    }

    const perMonth = remaining / months;
    const perWeek = remaining / (months * 4); // ประมาณ 4 สัปดาห์ต่อเดือน
    const perDay = remaining / (months * 30); // ประมาณ 30 วันต่อเดือน

    const replyText =
      `สรุปเป้าหมายของคุณ 🔍\n\n` +
      `เป้าหมาย: ${target.toLocaleString()} บาท\n` +
      `มีอยู่แล้ว: ${current.toLocaleString()} บาท\n` +
      `ต้องเก็บเพิ่มอีกทั้งหมด: ${remaining.toLocaleString()} บาท\n` +
      `ภายใน: ${months} เดือน\n\n` +
      `ถ้าจะให้ถึงเป้า ต้องเก็บประมาณ:\n` +
      `• เดือนละ ~ ${Math.round(perMonth).toLocaleString()} บาท\n` +
      `• สัปดาห์ละ ~ ${Math.round(perWeek).toLocaleString()} บาท\n` +
      `• วันละ ~ ${Math.round(perDay).toLocaleString()} บาท\n\n` +
      `ถ้าอยากลองใหม่ก็พิมพ์ในรูปแบบเดิมได้เลย เช่น\n` +
      `เป้า 15000 มีแล้ว 2000 ภายใน 6 เดือน`;

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: replyText,
    });
  }

  // ถ้าไม่ตรง pattern เลย ให้ส่งวิธีใช้กลับไป
  const helpText =
    "ตอนนี้บอทช่วยคำนวณแผนเก็บเงินได้แบบนี้จ้า 💰\n\n" +
    "ให้พิมพ์ในรูปแบบ:\n" +
    "เป้า 30000 มีแล้ว 5000 ภายใน 8 เดือน\n\n" +
    "แปลว่า:\n" +
    "- อยากมีเงิน 30,000 บาท\n" +
    "- ตอนนี้มีอยู่แล้ว 5,000 บาท\n" +
    "- อยากเก็บให้ครบภายใน 8 เดือน\n\n" +
    "บอทจะช่วยคิดให้ว่า ต้องเก็บเดือนละ / สัปดาห์ละ / วันละเท่าไหร่ 😊";

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: helpText,
  });
}

// เริ่มรัน server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Bot server running on port", PORT);
});
