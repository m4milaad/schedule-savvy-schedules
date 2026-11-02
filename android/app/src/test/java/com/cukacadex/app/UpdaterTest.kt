package com.cukacadex.app

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class UpdaterTest {
    @Test
    fun comparesVersionsNumerically() {
        assertTrue(Updater.isNewer("6.6.5", "6.6.4"))
        assertTrue(Updater.isNewer("6.6.10", "6.6.4"))
        assertTrue(Updater.isNewer("6.7", "6.6.4"))
        assertFalse(Updater.isNewer("6.6.4", "6.6.4"))
        assertFalse(Updater.isNewer("6.6.0", "6.6.4"))
        assertFalse(Updater.isNewer("6.6", "6.6.0"))
    }
}
