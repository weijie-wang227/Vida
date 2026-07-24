package com.example.vida.feature.activities

enum class ActivityCollection(
    val routeValue: String,
    val title: String,
    val emptyMessage: String,
    val mark: String,
) {
    Free(
        routeValue = "free",
        title = "Free Activities",
        emptyMessage = "No free activities are available right now.",
        mark = "FREE",
    ),
    Premium(
        routeValue = "premium",
        title = "Premium Activities",
        emptyMessage = "No premium activities are available right now.",
        mark = "P",
    ),
    SkillsFuture(
        routeValue = "skillsfuture",
        title = "SkillsFuture Payable",
        emptyMessage = "No SkillsFuture payable activities are available right now.",
        mark = "SF",
    ),
    Volunteer(
        routeValue = "volunteer",
        title = "Volunteer Activities",
        emptyMessage = "No volunteer activities are available right now.",
        mark = "V",
    ),
    AAC(
        routeValue = "aac",
        title = "AAC Activities",
        emptyMessage = "No AAC activities are available right now.",
        mark = "AAC",
    ),
    ;

    companion object {
        fun fromRoute(value: String): ActivityCollection? =
            entries.firstOrNull { it.routeValue == value }
    }
}
