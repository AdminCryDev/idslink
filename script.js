import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvGRVV3ydnlYp2HIukt66SCeILnmwfFcM",
  authDomain: "nvmm-266db.firebaseapp.com",
  projectId: "nvmm-266db",
  storageBucket: "nvmm-266db.firebasestorage.app",
  messagingSenderId: "583207945939",
  appId: "1:583207945939:web:3d194cb04fb96ff0c8b626",
  measurementId: "G-8NRMB3GEWM",
};

const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase);

function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerText = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

async function updateStats() {
  const collRef = collection(db, "shortLinks");
  const snapshot = await getDocs(collRef);
  const total = snapshot.size;
  // Update total count
  animateValue(
    document.getElementById("totalCount"),
    parseInt(document.getElementById("totalCount").innerText),
    total,
    1000
  );

  let countToday = 0;
  let monthCounts = {};
  let dayCounts = {};
  let yearCounts = {};
  const today = new Date();

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.createdAt) return;
    const d = new Date(data.createdAt);
    if (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    ) {
      countToday++;
    }
    const monthKey = d.getMonth(); // 0-11
    monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    const dayKey = d.toISOString().slice(0, 10);
    dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
    const yearKey = d.getFullYear();
    yearCounts[yearKey] = (yearCounts[yearKey] || 0) + 1;
  });
  animateValue(
    document.getElementById("todayCount"),
    parseInt(document.getElementById("todayCount").innerText),
    countToday,
    1000
  );

  let topMonth = null,
    topMonthCount = 0;
  for (let m in monthCounts) {
    if (monthCounts[m] > topMonthCount) {
      topMonthCount = monthCounts[m];
      topMonth = parseInt(m);
    }
  }
  let topDay = null,
    topDayCount = 0;
  for (let d in dayCounts) {
    if (dayCounts[d] > topDayCount) {
      topDayCount = dayCounts[d];
      topDay = d;
    }
  }
  let topYear = null,
    topYearCount = 0;
  for (let y in yearCounts) {
    if (yearCounts[y] > topYearCount) {
      topYearCount = yearCounts[y];
      topYear = y;
    }
  }
  let maxCount = Math.max(topMonthCount, topDayCount, topYearCount);
  let periodText = "";
  if (maxCount === topDayCount) {
    periodText = `Tanggal ${topDay} (${topDayCount} link)`;
  } else if (maxCount === topMonthCount) {
    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    periodText = `Bulan ${monthNames[topMonth]} (${topMonthCount} link)`;
  } else if (maxCount === topYearCount) {
    periodText = `Tahun ${topYear} (${topYearCount} link)`;
  }
  document.getElementById("topPeriod").innerText = periodText;
}
updateStats();

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

async function shortenUrl() {
  const longUrl = document.getElementById("longUrl").value;
  if (!longUrl.startsWith("http")) {
    showToast("Masukkan URL yang valid!");
    return;
  }
  let customEndpoint = document.getElementById("customEndpoint").value.trim();
  let shortId = "";
  if (customEndpoint) {
    const docRef = doc(db, "shortLinks", customEndpoint);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      showToast("Endpoint sudah digunakan, silahkan pilih yang lain.");
      return;
    }
    shortId = customEndpoint;
  } else {
    shortId = Math.random().toString(36).substring(2, 8);
  }
  await setDoc(doc(db, "shortLinks", shortId), {
    longUrl: longUrl,
    createdAt: new Date().toISOString(),
  });
  const shortLink = `${window.location.origin}?s=${shortId}`;
  document.getElementById(
    "modalLink"
  ).innerHTML = `<a href="${shortLink}" target="_blank">${shortLink}</a>`;
  document.getElementById("qrcode").innerHTML = "";
  new QRCode(document.getElementById("qrcode"), {
    text: shortLink,
    width: 128,
    height: 128,
  });
  document.getElementById("shareTwitter").onclick = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=Check%20this%20link:%20${encodeURIComponent(
        shortLink
      )}`,
      "_blank"
    );
  };
  document.getElementById("shareFacebook").onclick = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        shortLink
      )}`,
      "_blank"
    );
  };
  document.getElementById("shareWhatsApp").onclick = () => {
    window.open(
      `https://api.whatsapp.com/send?text=Check%20this%20link:%20${encodeURIComponent(
        shortLink
      )}`,
      "_blank"
    );
  };
  openModal();
  showToast("Link berhasil dipendekkan!");
  updateStats();
}

document.getElementById("copyBtn").addEventListener("click", () => {
  const linkText = document.getElementById("modalLink").innerText;
  navigator.clipboard
    .writeText(linkText)
    .then(() => showToast("Link disalin ke clipboard!"))
    .catch(() => showToast("Gagal menyalin link!"));
});

document.getElementById("closeModal").addEventListener("click", () => {
  closeModal();
});

function openModal() {
  document.getElementById("resultModal").classList.add("show");
  document.querySelector(".main-content").classList.add("blurred");
}

function closeModal() {
  document.getElementById("resultModal").classList.remove("show");
  document.querySelector(".main-content").classList.remove("blurred");
}

(async function checkRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const shortId = urlParams.get("s");
  if (shortId) {
    const docRef = doc(db, "shortLinks", shortId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      window.location.href = docSnap.data().longUrl;
    } else {
      document.body.innerHTML =
        "<h2 style='color: #fff; text-align: center; margin-top: 50px;'>Link tidak ditemukan!</h2>";
    }
  }
})();

window.shortenUrl = shortenUrl;
