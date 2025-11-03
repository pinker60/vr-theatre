import { db } from "./db";
import { users, contents } from "../shared/schema";
import bcrypt from "bcrypt";

/**
 * Seed script - Populates database with demo data
 * Creates admin user and 12 sample VR theatre contents
 */
async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create admin user
  const hashedPassword = await bcrypt.hash("admin", 10);
    
    const [adminUser] = await db
      .insert(users)
      .values({
        name: "Admin",
        email: "admin@vr.local",
        password: hashedPassword,
        theater: "VR Theatre Official",
        isVerified: true,
        isSeller: true,
        // mark as admin explicitly in sqlite storage layer expects is_admin, but drizzle schema uses isVerified/isSeller only; we'll still seed and then promote via API if needed
      })
      .returning()
      .onConflictDoNothing();

    console.log("✅ Admin user created:", adminUser?.email || "already exists");

    // Sample VR theatre contents
    const sampleContents = [
      {
        title: "Amleto - Dietro le Quinte",
        description: "Un'esperienza immersiva nel backstage del celebre Amleto. Esplora i segreti della produzione e incontra gli attori.",
        imageUrl: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80",
        duration: 15,
        tags: ["drammatico", "dietrolequinte", "shakespeare"],
        vrUrl: "https://example.com/vr/hamlet",
        createdBy: adminUser?.id || "",
      },
      {
        title: "La Traviata in Realtà Virtuale",
        description: "Vivi l'opera lirica più amata di Verdi in prima persona. Siediti tra il pubblico del Teatro alla Scala.",
        imageUrl: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800&q=80",
        duration: 120,
        tags: ["opera", "classico", "verdi"],
        vrUrl: "https://example.com/vr/traviata",
        createdBy: adminUser?.id || "",
      },
      {
        title: "Il Lago dei Cigni - Balletto VR",
        description: "Esperienza immersiva del balletto più iconico di Tchaikovsky. Danza tra i cigni in una produzione mozzafiato.",
        imageUrl: "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800&q=80",
        duration: 90,
        tags: ["balletto", "classico", "danza"],
        vrUrl: "https://example.com/vr/swan-lake",
        createdBy: adminUser?.id || "",
      },
      {
        title: "Molto Rumore per Nulla - Commedia",
        description: "La commedia shakespeariana in chiave moderna. Ridi e divertiti in questa produzione innovativa.",
        imageUrl: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800&q=80",
        duration: 105,
        tags: ["commedia", "shakespeare", "contemporaneo"],
        vrUrl: "https://example.com/vr/much-ado",
        createdBy: adminUser?.id || "",
      },
      {
        title: "Romeo e Giulietta - Versione Integrale",
        description: "La tragedia d'amore più famosa al mondo. Vivi ogni emozione come se fossi a Verona.",
        imageUrl: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80",
        duration: 135,
        tags: ["drammatico", "shakespeare", "tragedia"],
        vrUrl: "https://example.com/vr/romeo-juliet",
        createdBy: adminUser?.id || "",
      },
      {
        title: "Il Barbiere di Siviglia",
        description: "L'opera buffa di Rossini ti aspetta. Esplora il palco e i costumi in questa esperienza interattiva.",
        imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
        duration: 95,
        tags: ["opera", "commedia", "rossini"],
        vrUrl: "https://example.com/vr/barbiere",
        createdBy: adminUser?.id || "",
      },
      {
        title: "Macbeth - La Tragedia Scozzese",
        description: "Immergiti nell'oscurità di Macbeth. Un'esperienza VR che ti porterà nel cuore della Scozia medievale.",
        imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
        duration: 110,
        tags: ["drammatico", "shakespeare", "thriller"],
        vrUrl: "https://example.com/vr/macbeth",
        createdBy: adminUser?.id || "",
      },
      {
        title: "Lo Schiaccianoci - Balletto Natalizio",
        description: "Il balletto natalizio per eccellenza in VR. Perfetto per tutta la famiglia.",
        imageUrl: "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800&q=80",
        duration: 80,
        tags: ["balletto", "famiglia", "natale"],
        vrUrl: "https://example.com/vr/nutcracker",
        createdBy: adminUser?.id || "",
      },
      {
        title: "Otello - Tragedia e Gelosia",
        description: "La potente opera di Verdi basata su Shakespeare. Vivi la passione e la tragedia in prima persona.",
        imageUrl: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800&q=80",
        duration: 125,
        tags: ["opera", "drammatico", "verdi"],
        vrUrl: "https://example.com/vr/otello",
        createdBy: adminUser?.id || "",
      },
      {
        title: "La Bisbetica Domata",
        description: "La commedia shakespeariana più irriverente in una produzione moderna e coinvolgente.",
        imageUrl: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800&q=80",
        duration: 100,
        tags: ["commedia", "shakespeare", "romantico"],
        vrUrl: "https://example.com/vr/shrew",
        createdBy: adminUser?.id || "",
      },
      {
        title: "Carmen - Passione Spagnola",
        description: "L'opera di Bizet che ha conquistato il mondo. Vivi la Spagna del XIX secolo in VR.",
        imageUrl: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800&q=80",
        duration: 115,
        tags: ["opera", "drammatico", "spagnolo"],
        vrUrl: "https://example.com/vr/carmen",
        createdBy: adminUser?.id || "",
      },
      {
        title: "Giselle - Balletto Romantico",
        description: "Il balletto romantico che ha definito un'epoca. Vola con le Willis in questa esperienza magica.",
        imageUrl: "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800&q=80",
        duration: 85,
        tags: ["balletto", "romantico", "classico"],
        vrUrl: "https://example.com/vr/giselle",
        createdBy: adminUser?.id || "",
      },
    ];

    // Insert contents only if admin user was created
    if (adminUser) {
      await db.insert(contents).values(sampleContents).onConflictDoNothing();
      console.log("✅ Sample contents created:", sampleContents.length, "items");
    }

    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
