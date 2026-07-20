package com.example.vida.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.vida.core.designsystem.theme.VidaBlue
import com.example.vida.core.designsystem.theme.VidaGold
import com.example.vida.core.designsystem.theme.VidaGreen
import com.example.vida.core.designsystem.theme.VidaPink

@Composable
fun VidaProgressMark(
    modifier: Modifier = Modifier,
    size: Dp = 34.dp,
) {
    Column(
        modifier = modifier
            .size(size)
            .clip(RoundedCornerShape(10.dp)),
    ) {
        ProgressRow(VidaGreen, VidaGold, Modifier.weight(1f))
        ProgressRow(VidaPink, VidaBlue, Modifier.weight(1f))
    }
}

@Composable
private fun ProgressRow(
    startColor: Color,
    endColor: Color,
    modifier: Modifier = Modifier,
) {
    Row(modifier = modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxSize()
                .background(startColor),
        )
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxSize()
                .background(endColor),
        )
    }
}
