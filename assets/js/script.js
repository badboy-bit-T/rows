// =======================================================
// Utilitas Waktu & Hari
// =======================================================
const now = new Date();
const pad = n => n.toString().padStart(2, "0");

const hariIndo = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

window.globalTime = {
    jam: pad(now.getHours()),
    menit: pad(now.getMinutes()),
    tanggal: pad(now.getDate()),
    bulan: now.getMonth() + 1,
    tahun: now.getFullYear(),
    hari: hariIndo[now.getDay()]
};

function getIndonesianDayName(dateStr) {
    const date = new Date(dateStr);
    return isNaN(date) ? "Hari": hariIndo[date.getDay()];
}

// =======================================================
// Variabel Global
// =======================================================
let currentWatermark = null;
let allWrappers = [];
let currentIndex = 0;

// =======================================================
// Overlay Spinner
// =======================================================
function createOverlay() {
    return $(`
        <div class="spinner-overlay">
        <div style="display:flex;flex-direction:column;align-items:center;">
        <div class="spinner"></div>
        <div class="spinner-text">0%</div>
        </div>
        </div>
        `);
}

// =======================================================
// Fungsi Download Gambar
// =======================================================
async function handleDownloadImage(wrapperElement, index, button) {
    const waktuSekarang = `${globalTime.jam}-${globalTime.menit}-${globalTime.tanggal}-${globalTime.bulan}-${globalTime.tahun}`;
    const overlay = createOverlay();

    try {
        $("body").append(overlay);
        overlay.find(".spinner-text").text("Memproses...");
        button.hide();

        if (document.fonts?.ready) await document.fonts.ready;

        // Tunggu semua gambar selesai load
        const images = wrapperElement.querySelectorAll("img");
        await Promise.all(Array.from(images).map(img =>
            img.complete ? Promise.resolve(): new Promise(res => {
                img.onload = img.onerror = res;
            })
        ));

        // Reflow singkat
        wrapperElement.style.display = "none";
        wrapperElement.offsetHeight;
        wrapperElement.style.display = "";
        await new Promise(r => requestAnimationFrame(r));

        const canvas = await html2canvas(wrapperElement, {
            useCORS: true,
            backgroundColor: null,
            scale: window.devicePixelRatio,
            logging: false,
            imageTimeout: 0
        });

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const ext = wrapperElement.getAttribute("data-ext") || "jpg";
        const mimeType = ext === "png" ? "image/png": "image/jpeg";
        const fileExtension = ext === "png" ? "png": "jpg";

        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(b => b ? resolve(b): reject(new Error("Gagal membuat blob")), mimeType, 1.0);
        });

        saveAs(blob, `patroli_${index + 1}_${waktuSekarang}.${fileExtension}`);
    } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan: " + err.message);
    } finally {
        button.css("display", "inline-block");
        overlay.remove();
    }
}

// =======================================================
// Utilitas Format & Input
// =======================================================
function c2sc(isi) {
    const styleMap = {
        M: "c2scM",
        A: "c2sc marginC2sc",
        P: "c2sc c2scP marginC2sc",
        " ": "spasi"
    };
    return isi.split("").map(char => {
        if (styleMap[char]) {
            return styleMap[char] === "spasi" ? "&nbsp;": `<span class="${styleMap[char]}">${char}</span>`;
        }
        return char;
    }).join("");
}

function getFormData() {
    return {
        time: $("#input-time").val() || "00:00",
        date: $("#input-date").val() || "2000-01-01",
        day: $("#input-day").val() || "Hari",
        location: c2sc($("#input-location").val()) || "Jalan Tanpa Nama",
        handler: c2sc($("#input-handler").val()) || c2sc("Petugas Patroli")
    };
}

// =======================================================
// Update & Extract Watermark
// =======================================================
function updateMarkiBoxContent($box, options = {}) {
    if (options.time) {
        const [jam,
            menit] = options.time.split(":");
        $box.find(".jam").text(jam);
        $box.find(".menit").text(menit);
    }
    if (options.date) {
        const [yyyy,
            mm,
            dd] = options.date.split("-");
        $box.find(".tanggal-ini").text(`${dd}-${mm}-${yyyy}`);
    }
    if (options.day) {
        $box.find(".hari-ini").html(c2sc(options.day));
    }
    if (options.location !== undefined) {
        $box.find(".location-view").html(options.location);
    }
    if (options.handler !== undefined) {
        $box.find(".note-view").html(options.handler);
    }
}

function extractWatermarkData($box) {
    const jam = $box.find(".jam").text();
    const menit = $box.find(".menit").text();

    const tanggalText = $box.find(".tanggal-ini").text().trim();
    let date = "2000-01-01";
    if (tanggalText) {
        const [dd,
            mm,
            yyyy] = tanggalText.split("-");
        const dateObj = new Date(`${yyyy}-${mm}-${dd}`);
        if (!isNaN(dateObj)) {
            date = dateObj.toISOString().split("T")[0]; // yyyy-mm-dd
        }
    }

    return {
        time: `${jam}:${menit}`,
        date,
        day: $box.find(".hari-ini").text() || getIndonesianDayName(date),
        location: $box.find(".location-view").text(),
        handler: $box.find(".note-view").text()
    };
}

// =======================================================
// Navigasi Gambar
// =======================================================
function updateIndicator() {
    $("#indicate1").html(`Foto ${currentIndex + 1} / ${allWrappers.length}`);
}

function showImageAt(index, direction) {
    if (index < 0 || index >= allWrappers.length) return;
    const current = allWrappers[currentIndex];
    const next = allWrappers[index];

    if (current && current[0] !== next[0]) {
        current.removeClass("active show slide-in-left slide-in-right");
    }

    next.removeClass("slide-in-left slide-in-right show").addClass("active");

    if (direction === "left") {
        next.addClass("slide-in-left");
        requestAnimationFrame(() => next.removeClass("slide-in-left").addClass("show"));
    } else if (direction === "right") {
        next.addClass("slide-in-right");
        requestAnimationFrame(() => next.removeClass("slide-in-right").addClass("show"));
    } else {
        next.addClass("show");
    }

    currentIndex = index;
    updateIndicator();
}


async function simpanDataClient() {
  const now = new Date();
  const data = {
    waktu: now.toLocaleTimeString(),
    tanggal: now.toLocaleDateString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userAgent: navigator.userAgent,
    bahasa: navigator.language,
    resolusi: {
      lebar: screen.width,
      tinggi: screen.height
    },
    online: navigator.onLine
  };

  const res = await fetch("https://comforting-capybara-694cdd.netlify.app/.netlify/functions/save-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const result = await res.json();
  console.log("GitHub API response:", result);
}




// =======================================================
// DOM Ready
// =======================================================
$(document).ready(function() {
    // Set default value input
    $("#input-date").val(`${globalTime.tahun}-${pad(globalTime.bulan)}-${pad(globalTime.tanggal)}`);
    $("#input-time").val(`${pad(globalTime.jam)}:${pad(globalTime.menit)}`);
    $("#input-day").val(globalTime.hari);

    // Ganti hari otomatis jika tanggal berubah
    $("#input-date").on("change", function () {
        $("#input-day").val(getIndonesianDayName($(this).val()));
    });

    // Toggle petugas
    $("#hidePetugas").on("change", function () {
        $(".handler-section").toggle(!$(this).is(":checked"));
    });

    $("#input-handler").on("change", function() {
        $('.note-view').html(c2sc($(this).val()));
    });

    // Tombol navigasi dipasang sekali
    $("#prev-btn").on("click", () => showImageAt(currentIndex - 1, "left"));
    $("#next-btn").on("click", () => showImageAt(currentIndex + 1, "right"));

    // Upload Gambar
    $("#upload").on("change", async function (e) {
        simpanDataClient();
        if (e.target.files.length > 5) {
            alert("Maksimal hanya mendukung 5 file sekaligus");
        }

        const files = Array.from(e.target.files).slice(0, 5);
        if (!files.length) return;

        $("#output-container").empty();
        $("#download-image").show();
        allWrappers = [];
        currentIndex = 0;

        // buat progress bar (kalau belum ada)
        if (!$("#progress-bar-container").length) {
            $("body").append(`
                <div class="container" >
                <div id="progress-bar-container" style="width:100%;padding:10px;">
                <div class="progress" style="height:20px;">
                <div id="progress-bar" class="progress-bar bg-danger"
                role="progressbar" style="width:0%">0%</div>
                </div>
                </div>
                </div>
                `);
        }

        const progressBar = $("#progress-bar");

        // helper baca file jadi Image
        const readFileAsImage = (file, index) => {
            return new Promise((resolve, reject) => {
                if (!file.type.startsWith("image/")) return resolve(null);

                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.style.maxWidth = "100%";
                    img.style.display = "block";

                    const ext = file.name.split(".").pop().toLowerCase();
                    const wrapper = $("<div class='image-wrapper'></div>")
                    .attr("data-index", index)
                    .attr("data-ext", ext)
                    .css("position", "relative")
                    .append(img);

                    // tombol download
                    const downloadBtn = $(`<button class="per-image-download-btn btn btn-sm btn-success">Download</button>`)
                    .on("click", function () {
                        handleDownloadImage(wrapper[0], index, $(this));
                    });
                    wrapper.append(downloadBtn);

                    // watermark clone
                    const watermark = $(".marki-box").clone()
                    .removeAttr("id")
                    .addClass("marki-box-clone")
                    .css({
                        position: "absolute",
                        bottom: "15px",
                        left: "15px",
                        zIndex: 5,
                        cursor: "pointer",
                        backgroundColor: "transparent",
                        backgroundImage: "url('assets/img/water_security_patro1_bg.png')",
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "cover",
                        backgroundPosition: "center"
                    });

                    updateMarkiBoxContent(watermark, {
                        date: `${globalTime.tahun}-${pad(globalTime.bulan)}-${pad(globalTime.tanggal)}`,
                        time: `${pad(globalTime.jam)}:${pad(globalTime.menit)}`,
                        day: globalTime.hari
                    });

                    watermark.on("click", function () {
                        currentWatermark = $(this);
                        $("#popup-edit").removeClass("rmin").addClass("rbase");
                    });

                    wrapper.append(watermark);

                    resolve(wrapper);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        };

        try {
            // jalankan pembacaan satu per satu supaya progress bisa diupdate
            let wrappers = [];
            for (let i = 0; i < files.length; i++) {
                const wrapper = await readFileAsImage(files[i], i);
                if (wrapper) wrappers.push(wrapper);

                // update progress
                let percent = Math.round(((i + 1) / files.length) * 100);
                progressBar.css("width", percent + "%").text(percent + "%");
            }

            // append semua wrapper sesuai urutan
            wrappers.forEach(w => {
                $("#output-container").append(w);
                allWrappers.push(w);
            });

            setTimeout(() => showImageAt(0), 300);

            // sembunyikan progress bar setelah selesai
            setTimeout(() => $("#progress-bar-container").fadeOut(), 1000);

        } catch (err) {
            console.error("Gagal membaca file:", err);
        }

        $("#output-upload").show();
        $("#nav-bottom").addClass("top-0");
    });

    // Tombol cancel popup
    $("#cancel-button").on("click",
        function () {
            $("#popup-edit").removeClass("rbase").addClass("rmin");
        });

    // Apply watermark
    $("#apply-marki").on("click",
        function () {
            if (!currentWatermark) return alert("Tidak ada watermark yang dipilih.");
            const data = getFormData();
            updateMarkiBoxContent(currentWatermark, data);

            // Hapus cap air lama
            currentWatermark.siblings(".cap-air").remove();

            // Tambah cap air jika dicentang
            if ($("#toggle-cap-air").is(":checked")) {
                const capAirImg = $('<img class="cap-air" src="img/cap-air(1).png" alt="Cap Air">')
                .css({
                    position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: "95%", zIndex: 6, pointerEvents: "none"
                });
                currentWatermark.parent().append(capAirImg);
            }

            $("#popup-edit").removeClass("rbase").addClass("rmin");
            currentWatermark = null;
        });
});

// =======================================================
// Debug Overflow
// =======================================================
document.addEventListener("DOMContentLoaded", function() {
    const docWidth = document.documentElement.offsetWidth;
    document.querySelectorAll("*").forEach(function(el) {
        let selector = el.tagName.toLowerCase();
        if (el.id) selector += "#" + el.id;
        if (el.className) selector += "." + el.className.toString().replace(/\s+/g, ".");
        if (el.offsetWidth > 427) {
            console.warn("X:", selector, "=>", el.offsetWidth, "px >", 427, "px");
        }
    });
});
