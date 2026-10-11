# DALLI E-commerce - Laptop Pokretanje

## Brzo pokretanje (3 opcije):

### OPCIJA 1: Dupli klik na `START.bat`  ⭐ **NAJJEDNOSTAVNIJE**
- Ne treba ništa instalirati ako imaš Python
- Otvara browser automatski na `http://localhost:3000`

### OPCIJA 2: Desni klik na `START.ps1` → "Run with PowerShell"
- Ista stvar, ali u PowerShell-u

### OPCIJA 3: Ručno u terminalu
```bash
cd "C:\Users\haris\Documents\Default Project\moonlight-sajt"
python -m http.server 3000
```
Pa otvori browser: **http://localhost:3000**

---

## 🔑 PRIJAVA / REGISTRACIJA

| Stranica | URL |
|----------|-----|
| **Početna** | http://localhost:3000 |
| **Registracija/Prijava** | http://localhost:3000 (klikni "Registracija" ili "Prijava" u headeru) |
| **Admin Panel** | http://localhost:3000/admin-login.html |

**Admin podaci:**
- Korisničko ime: `harissacirovic`
- Lozinka: `lenovo123`

---

## ✨ ŠTA RADI (sve funkcije):

### 👤 Korisnički sistem
- **Registracija** → dobijaš **10% popust** na sve proizvode
- **Prijava** → popust se automatski primenjuje
- **Profil** → izmena podataka, promena lozinke, marketing pristanka
- **Popust** → vidi se u korpi i checkout-u kao `-X RSD`

### 🛒 Prodavnica
- Svi proizvodi (majice, trenerke, dukseri, čarape, šalice)
- Kategorije: Muška/Ženska garderoba, Dukseri
- Korpa, Checkout (plaćanje pri preuzimanju)
- Dark/Light mode (dugme 🌙/☀️ u headeru + taster `T`)

### 🎛️ Admin Panel (DALLI)
- **Narudžbine** - bulk akcije, export CSV, filter kolone
- **Žalbe & Vraćanja**
- **Reklame & Partnerstvo**
- **Knjigovodstvo** - mesečni izveštaji
- **Analitika** - grafikoni, top proizvodi
- **Kupci** - baza sa statistikama
- **Zaposleni** - dodavanje, uloge
- **Keyboard shortcuts** (`?` za pomoć)
- **Dark mode** (`T` taster)

### ⌨️ Prečice (radе na admin-u):
| Prečica | Akcija |
|---------|--------|
| `?` | Prikaži sve prečice |
| `T` | Dark/Light mode |
| `/` | Fokus na pretragu |
| `Ctrl/Cmd + N` | Dodaj zaposlenog |
| `Ctrl/Cmd + E` | Export CSV |
| `Ctrl/Cmd + 1-6` | Tab navigacija |
| `Esc` | Zatvori modal/dropdown |

---

## 📁 STRUKTURA PROJEKTA
```
moonlight-sajt/
├── index.html              # Početna
├── products.html           # Svi proizvodi
├── cart.html               # Korpa
├── checkout.html           # Checkout
├── admin.html              # Admin panel
├── admin-login.html        # Admin login
├── js/
│   ├── app.js              # Frontend logika + auth
│   └── admin.js            # Admin logika
├── css/
│   ├── style.css           # Frontend stilovi
│   └── admin.css           # Admin stilovi (1450+ linija)
├── images/                 # SVG ikone + tvoja slika
├── admin/                  # Netlify CMS config
└── START.bat / START.ps1   # Launcher skripte
```

---

## ⚠️ VAŽNO
- **Moraš koristiti `http://localhost:3000`** (NE `file://` dupli klik na HTML)
- Moderni JS (ES6+) ne radi na `file://` protokolu
- Server **MORA** da radi u pozadini

---

## 🛑 ZAUSTAVLJANJE SERVERA
- U terminalu: `Ctrl + C`
- Ili zatvori prozor terminala

---

## 🔧 AKO NE RADI
1. Proveri da li je Python instaliran: `python --version`
2. Instaliraj Python sa: https://python.org (čekiraj "Add to PATH")
3. Restartuj terminal
4. Pokušaj ponovo