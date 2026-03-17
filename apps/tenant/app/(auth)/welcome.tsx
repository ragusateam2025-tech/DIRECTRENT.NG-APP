import React, { useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  id: number;
  emoji: string;
  title: string;
  subtitle: string;
  background: string;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    emoji: '🏠',
    title: 'Find Your Perfect Home',
    subtitle: 'Browse verified apartments directly from Lagos landlords',
    background: '#1B5E20',
  },
  {
    id: 2,
    emoji: '💰',
    title: 'No Agent Fees',
    subtitle: 'Save up to ₦100,000 on every rental — no middlemen',
    background: '#2E7D32',
  },
  {
    id: 3,
    emoji: '🔒',
    title: 'Safe & Secure',
    subtitle: 'Verified landlords, secure escrow, protected deposits',
    background: '#1565C0',
  },
];

export default function WelcomeScreen(): React.ReactElement {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const handleNext = () => {
    const nextIndex = activeIndex + 1;
    if (nextIndex < SLIDES.length) {
      scrollRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
      setActiveIndex(nextIndex);
    }
  };

  const markOnboardingComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem('DIRECTRENT_ONBOARDING_COMPLETE', 'true');
    } catch {
      // Non-critical — proceed even if storage fails
    }
  }, []);

  const handleGetStarted = useCallback(async () => {
    await markOnboardingComplete();
    router.replace('/(auth)/phone');
  }, [markOnboardingComplete]);

  const handleSkip = useCallback(async () => {
    await markOnboardingComplete();
    router.replace('/(auth)/phone');
  }, [markOnboardingComplete]);

  const currentSlide = SLIDES[activeIndex];
  const isLastSlide = activeIndex === SLIDES.length - 1;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: currentSlide?.background ?? '#1B5E20' }]}
    >
      {!isLastSlide && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide) => (
          <View
            key={slide.id}
            style={[styles.slide, { width: SCREEN_WIDTH, backgroundColor: slide.background }]}
          >
            <Text style={styles.emoji}>{slide.emoji}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        {isLastSlide ? (
          <TouchableOpacity
            style={styles.getStartedBtn}
            onPress={handleGetStarted}
            activeOpacity={0.85}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextText}>Next →</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emoji: {
    fontSize: 96,
    marginBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 26,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 16,
    paddingTop: 8,
  },
  dot: {
    borderRadius: 5,
    height: 10,
  },
  dotActive: {
    width: 28,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 10,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
  },
  getStartedBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  getStartedText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1B5E20',
  },
  nextBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  nextText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
