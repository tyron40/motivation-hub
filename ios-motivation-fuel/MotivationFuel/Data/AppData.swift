import Foundation

/// Static seed content: categories, flyers, scriptures, quotes and fallback speeches.
nonisolated enum AppData {

    // MARK: - Categories

    static let categories: [SpeechCategory] = [
        SpeechCategory(id: "1", name: "Motivation", symbol: "flame.fill", colorHex: "#FF6B6B", speechCount: 35),
        SpeechCategory(id: "2", name: "Success", symbol: "trophy.fill", colorHex: "#4ECDC4", speechCount: 28),
        SpeechCategory(id: "3", name: "Mindset", symbol: "brain.head.profile", colorHex: "#45B7D1", speechCount: 25),
        SpeechCategory(id: "4", name: "Fitness", symbol: "bolt.fill", colorHex: "#FF9F43", speechCount: 20),
        SpeechCategory(id: "5", name: "Study", symbol: "book.fill", colorHex: "#DDA0DD", speechCount: 18),
    ]

    static let churchCategory = SpeechCategory(
        id: "church",
        name: "Christian Motivation",
        symbol: "building.columns.fill",
        colorHex: "#FFD700",
        speechCount: 30
    )

    static let athleteCategory = SpeechCategory(
        id: "athlete",
        name: "Athlete Pump Up",
        symbol: "figure.run",
        colorHex: "#EF4444",
        speechCount: 25
    )

    /// Keyword table used to classify a fetched video into an app category.
    static let categoryKeywords: [String: [String]] = [
        "Motivation": ["motivat", "inspire", "dream", "never give up", "keep going", "grind", "hustle", "push", "fuel"],
        "Success": ["success", "wealth", "money", "business", "entrepreneur", "rich", "financial", "leadership", "win"],
        "Mindset": ["mindset", "mental", "psychology", "think", "brain", "habit", "attitude", "belief", "focus"],
        "Fitness": ["fitness", "workout", "gym", "exercise", "body", "health", "training", "muscle", "strength"],
        "Study": ["study", "learn", "education", "read", "knowledge", "school", "focus", "concentration", "productivity"],
        "Christian Motivation": ["christian", "church", "god", "jesus", "faith", "prayer", "sermon", "gospel", "bible", "lord", "scripture", "worship", "holy"],
        "Athlete Pump Up": ["athlete", "sports", "game day", "pump up", "pregame", "championship", "competition", "team", "football", "basketball", "soccer", "beast mode", "warrior", "champion", "mvp", "playoff"],
    ]

    /// Picks the best matching category for a video by keyword frequency.
    static func classify(title: String, description: String) -> String {
        let text = "\(title) \(description)".lowercased()
        var bestCategory = "Motivation"
        var bestScore = 0
        for (category, keywords) in categoryKeywords {
            let score = keywords.reduce(into: 0) { partial, keyword in
                if text.contains(keyword) { partial += 1 }
            }
            if score > bestScore {
                bestScore = score
                bestCategory = category
            }
        }
        return bestCategory
    }

    // MARK: - Daily quotes

    struct Quote: Sendable {
        let text: String
        let author: String
    }

    static let quotes: [Quote] = [
        Quote(text: "The only way to do great work is to love what you do.", author: "Steve Jobs"),
        Quote(text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt"),
        Quote(text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius"),
        Quote(text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill"),
        Quote(text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt"),
        Quote(text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson"),
        Quote(text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis"),
        Quote(text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson"),
        Quote(text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis"),
        Quote(text: "The only impossible journey is the one you never begin.", author: "Tony Robbins"),
        Quote(text: "Act as if what you do makes a difference. It does.", author: "William James"),
        Quote(text: "Your limitation—it's only your imagination.", author: "Motivation Fuel"),
        Quote(text: "Push yourself, because no one else is going to do it for you.", author: "Motivation Fuel"),
        Quote(text: "Great things never come from comfort zones.", author: "Motivation Fuel"),
        Quote(text: "Dream it. Wish it. Do it.", author: "Motivation Fuel"),
        Quote(text: "Wake up with determination. Go to bed with satisfaction.", author: "Motivation Fuel"),
        Quote(text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery"),
        Quote(text: "It's going to be hard, but hard does not mean impossible.", author: "Motivation Fuel"),
        Quote(text: "Don't stop when you're tired. Stop when you're done.", author: "Motivation Fuel"),
        Quote(text: "Little things make big days.", author: "Motivation Fuel"),
        Quote(text: "The secret of getting ahead is getting started.", author: "Mark Twain"),
        Quote(text: "Stars can't shine without darkness.", author: "Motivation Fuel"),
        Quote(text: "Fall seven times, stand up eight.", author: "Japanese Proverb"),
        Quote(text: "What we achieve inwardly will change outer reality.", author: "Plutarch"),
        Quote(text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein"),
        Quote(text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair"),
        Quote(text: "You didn't come this far to only come this far.", author: "Motivation Fuel"),
        Quote(text: "If it doesn't challenge you, it won't change you.", author: "Fred DeVito"),
        Quote(text: "Life begins at the end of your comfort zone.", author: "Neale Donald Walsch"),
        Quote(text: "A winner is a dreamer who never gives up.", author: "Nelson Mandela"),
        Quote(text: "Stay patient and trust your journey.", author: "Motivation Fuel"),
    ]

    /// The quote of the day, rotating by calendar day like the original app.
    static var dailyQuote: Quote {
        let day = Calendar.current.component(.day, from: .now)
        return quotes[day % quotes.count]
    }

    // MARK: - Flyers

    static let flyers: [Flyer] = [
        Flyer(id: "flyer-featured-9", title: "Answer The Call",
              quote: "Answer your own calling. Discipline is picking up when purpose rings — every single day.",
              imageUrl: "https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=1200&q=80",
              accentHex: "#F39C12"),
        Flyer(id: "flyer-featured-1", title: "Lead By Example",
              quote: "Champions aren't made in the gym. They are made from something deep inside — a desire, a dream, a vision.",
              imageUrl: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/wt7d475pi62gwukgsuk1b",
              accentHex: "#FF8A00"),
        Flyer(id: "flyer-featured-2", title: "Stay Classy, Stay Driven",
              quote: "Success is not about the destination. It's about the discipline to show up every single day.",
              imageUrl: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/tasxymasv4s0goloscnfc",
              accentHex: "#D4AF37"),
        Flyer(id: "flyer-featured-3", title: "Speak Your Truth",
              quote: "Your voice has the power to change a room. Use it with purpose and conviction.",
              imageUrl: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/wiym5xw2upgg7fxh97rrb",
              accentHex: "#0984E3"),
        Flyer(id: "flyer-featured-4", title: "Walk With Purpose",
              quote: "Surround yourself with people who push you to be greater than you were yesterday.",
              imageUrl: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/pw5na02tdc3n5x3qkuz5h",
              accentHex: "#00B894"),
        Flyer(id: "flyer-featured-5", title: "Give Him Thanks", quote: "",
              imageUrl: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/txtqp27uxh6o4vsply68l",
              accentHex: "#E84393"),
        Flyer(id: "flyer-featured-6", title: "Surround Yourself With Greatness",
              quote: "Stand among masterpieces long enough and you'll start creating your own. Your environment shapes your vision.",
              imageUrl: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/764cq2ayf85psdl5wmhkl",
              accentHex: "#C0392B"),
        Flyer(id: "flyer-featured-7", title: "Iron Sharpens Iron",
              quote: "As iron sharpens iron, so does one person sharpens another. — Proverbs 27:17",
              imageUrl: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/hg5aerpcv5h4lr9xks2mh",
              accentHex: "#E74C3C"),
        Flyer(id: "flyer-featured-8", title: "No Easy Days",
              quote: "Strength isn't given. It's forged in the reps nobody sees, the early mornings, and the refusal to quit.",
              imageUrl: "https://r2-pub.rork.com/attachments/oks08iy57442gmz0y310r.png",
              accentHex: "#C0392B"),
        Flyer(id: "flyer-1", title: "Discipline Over Mood",
              quote: "You don't need to feel ready. You need to move anyway.",
              imageUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80",
              accentHex: "#FF8A00"),
        Flyer(id: "flyer-2", title: "Quiet Consistency",
              quote: "Small steps every day build a life that looks impossible today.",
              imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
              accentHex: "#00B894"),
        Flyer(id: "flyer-3", title: "Keep Going",
              quote: "You are closer than you think. Don't stop in the middle.",
              imageUrl: "https://images.unsplash.com/photo-1470468969717-61d5d54fd036?auto=format&fit=crop&w=1200&q=80",
              accentHex: "#0984E3"),
        Flyer(id: "flyer-4", title: "Built Different",
              quote: "Pressure doesn't break you. It reveals what you trained for.",
              imageUrl: "https://images.unsplash.com/photo-1571019613576-2b22c76fd955?auto=format&fit=crop&w=1200&q=80",
              accentHex: "#E84393"),
    ]

    // MARK: - Fallback content

    static let fallbackSpeeches: [Speech] = [
        Speech(id: "ji5_MqicxSo", title: "BEST MOTIVATIONAL SPEECH COMPILATION", speaker: "Various Speakers",
               duration: 495, category: "Motivation", imageUrl: "", youtubeId: "ji5_MqicxSo",
               description: "Transform your life with this powerful motivational speech compilation featuring the best speakers."),
        Speech(id: "6vuetQSwFW8", title: "WAKE UP AND WORK HARD", speaker: "Motivational Speakers",
               duration: 505, category: "Success", imageUrl: "", youtubeId: "6vuetQSwFW8",
               description: "Start your day with the energy and drive to chase what matters."),
        Speech(id: "mgmVOuLgFB0", title: "DREAM BIG — Motivational Speech", speaker: "Motivation Fuel",
               duration: 420, category: "Mindset", imageUrl: "", youtubeId: "mgmVOuLgFB0",
               description: "A reminder that your dreams are worth the discomfort it takes to reach them."),
        Speech(id: "g-jwWYX7Jlo", title: "NEVER GIVE UP", speaker: "MotivationHub",
               duration: 380, category: "Motivation", imageUrl: "", youtubeId: "g-jwWYX7Jlo",
               description: "When quitting feels easiest, this is the speech that keeps you moving."),
        Speech(id: "ZXsQAXx_ao0", title: "DO SOMETHING GREAT TODAY", speaker: "Motivation Fuel",
               duration: 300, category: "Motivation", imageUrl: "", youtubeId: "ZXsQAXx_ao0",
               description: "Greatness is a decision you make before the day begins."),
        Speech(id: "26U_seo0a1g", title: "DISCIPLINE OVER MOTIVATION", speaker: "Motivation Fuel",
               duration: 450, category: "Mindset", imageUrl: "", youtubeId: "26U_seo0a1g",
               description: "Motivation fades. Discipline is what carries you the rest of the way."),
    ]

    static let fallbackShortClips: [Speech] = [
        Speech(id: "clip-mgmVOuLgFB0", title: "Dream Big - Motivational Speech", speaker: "Motivation Fuel",
               duration: 55, category: "Motivation", imageUrl: "", youtubeId: "mgmVOuLgFB0", description: ""),
        Speech(id: "clip-g-jwWYX7Jlo", title: "Never Give Up - Short Motivation", speaker: "MotivationHub",
               duration: 60, category: "Motivation", imageUrl: "", youtubeId: "g-jwWYX7Jlo", description: ""),
        Speech(id: "clip-ZXsQAXx_ao0", title: "Do Something Great Today", speaker: "Motivation Fuel",
               duration: 48, category: "Motivation", imageUrl: "", youtubeId: "ZXsQAXx_ao0", description: ""),
        Speech(id: "clip-26U_seo0a1g", title: "Discipline Beats Talent", speaker: "Motivation Fuel",
               duration: 72, category: "Mindset", imageUrl: "", youtubeId: "26U_seo0a1g", description: ""),
    ]
}
