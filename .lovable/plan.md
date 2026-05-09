## Yang akan dikerjakan

### 1. Sistem Login (Email + Google) — supaya data sinkron antar device

Saat ini data tersimpan per `device_id` (random ID di localStorage tiap perangkat), itulah sebabnya laptop & HP tidak terhubung. Solusinya: ganti `device_id` menjadi `user_id` (akun login).

**Yang dibuat:**
- Halaman `/auth` (login + signup, email/password + tombol Google)
- Layout `_authenticated` melindungi semua data finansial → user belum login otomatis ke `/auth`
- Tombol logout di header
- Aktifkan Google OAuth (managed Lovable Cloud, otomatis aman)
- Email signup auto-confirm DIMATIKAN secara default (user verifikasi email dulu)

**Migrasi data:**
- Tambah kolom `user_id` (uuid) ke `incomes`, `bills`, `debts`, `expenses`, `chat_messages`, plus tabel baru `receivables`
- RLS dipasang ketat: `auth.uid() = user_id` untuk semua operasi
- Saat user pertama login, data lama dengan `device_id` lokal **otomatis di-claim** ke akun mereka (one-time migration di sisi client) — jadi data laptop tidak hilang setelah login
- Kolom `device_id` tetap ada (nullable) sebagai fallback historis, tapi query baru pakai `user_id`

### 2. Tab Piutang

- Tabel baru `receivables` (debtor, total_amount, remaining, priority, notes, due_date, user_id)
- Tab baru "Piutang" di sebelah "Hutang" (tab grid berubah dari 3 → 4 kolom)
- Form QuickAdd dapat tipe baru "Piutang" + komponen `ReceivablesList`
- Stat card baru "Total piutang" di dashboard

### 3. Card Stat lebih detail

Tiap card diperluas dengan info:
- **Saldo**: tanggal update terakhir, perubahan vs minggu lalu
- **Budget harian**: rumus (saldo − tagihan ÷ hari), warning kalau melebihi
- **Pemasukan berikut**: countdown jam & menit, total semua pemasukan terjadwal bulan ini
- **Tagihan menunggu**: pisah "telat", "hari ini", "minggu ini", tagihan paling dekat
- **Total hutang**: hutang prioritas tertinggi, rata-rata cicilan/bulan estimasi
- **Total piutang**: orang yang belum bayar paling lama
- **Pengeluaran 30 hari**: kategori terbesar, rata-rata harian, vs 30 hari sebelumnya

Card di-redesain jadi expandable (tap/click untuk lihat detail penuh) supaya tidak ramai di mobile.

### 4. Cicilan tagihan & tombol Edit

**Cicilan:**
- Tabel `bills` ditambah kolom `paid_amount` (numeric, default 0)
- Status `paid` jadi computed: `paid_amount >= amount`
- Tombol baru "Bayar sebagian" → dialog input jumlah → tambah ke `paid_amount`, otomatis kurangi saldo
- Progress bar di tiap tagihan (mirip hutang)
- Tombol "Lunasi" tetap ada (set `paid_amount = amount`)

**Edit:**
- Ikon pensil di setiap card (Tagihan, Hutang, Piutang, Pengeluaran, Pemasukan)
- Buka dialog edit (reuse komponen Quick Add) — pre-fill data, simpan = update row
- Hapus tetap di ikon trash terpisah

## Detail teknis

- Tambah package `lovable.auth` flow via `configure_social_auth` untuk Google
- File baru: `src/routes/auth.tsx`, `src/routes/_authenticated.tsx`, route protected pindah ke `_authenticated/index.tsx`
- Hook baru `useAuthUser()` di `src/lib/auth.ts`
- `queries.ts` ganti filter dari `device_id` → user-scoped (RLS otomatis filter, jadi cukup hilangkan `.eq("device_id", ...)`)
- Migrasi one-time: saat login pertama, jalankan UPDATE `user_id = auth.uid()` WHERE `device_id = <local>` AND `user_id IS NULL` via RPC function
- Edit dialog: komponen baru `EditDialog.tsx` dengan form generik per tipe
- `BillsList` dirombak: progress bar + tombol cicilan + edit
- Stat cards: komponen baru `StatCardDetailed.tsx` dengan collapsible content (Radix Collapsible)

## Urutan eksekusi
1. Migrasi DB (tambah `user_id`, tabel `receivables`, kolom `paid_amount`, RLS baru)
2. Aktifkan Google OAuth
3. Buat halaman auth + route guard + logout
4. Migrasi data device_id → user_id otomatis
5. Update queries (hapus device_id filter)
6. Tambah tab Piutang + komponen
7. Cicilan + tombol edit di Lists
8. Detail card

Setelah selesai: data laptop & HP otomatis sinkron via login, tagihan bisa dicicil, semua item bisa di-edit, tab Piutang aktif, dan card menampilkan info lengkap.