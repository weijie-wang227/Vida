package com.example.vida.feature.activities

import androidx.annotation.DrawableRes
import com.example.vida.R

enum class ActivityCollection(
    val routeValue: String,
    val title: String,
    val emptyMessage: String,
    val previewText: String,
    @DrawableRes val imageRes: Int,
) {
    Free(
        routeValue = "free",
        title = "Free Activities",
        emptyMessage = "No free activities are available right now.",
        previewText = "No-cost picks",
        imageRes = R.drawable.activity_collection_free,
    ),
    Premium(
        routeValue = "premium",
        title = "Premium Activities",
        emptyMessage = "No premium activities are available right now.",
        previewText = "Curated experiences",
        imageRes = R.drawable.activity_collection_premium,
    ),
    SkillsFuture(
        routeValue = "skillsfuture",
        title = "SkillsFuture Payable",
        emptyMessage = "No SkillsFuture payable activities are available right now.",
        previewText = "Eligible courses",
        imageRes = R.drawable.skills_future_removebg_preview,
    ),
    Volunteer(
        routeValue = "volunteer",
        title = "Volunteer Activities",
        emptyMessage = "No volunteer activities are available right now.",
        previewText = "Give back",
        imageRes = R.drawable.activity_collection_volunteer,
    ),
    AAC(
        routeValue = "aac",
        title = "AAC Activities",
        emptyMessage = "No AAC activities are available right now.",
        previewText = "Inclusive activities",
        imageRes = R.drawable.activity_collection_aac,
    ),
    ;

    companion object {
        fun fromRoute(value: String): ActivityCollection? =
            entries.firstOrNull { it.routeValue == value }
    }
}
