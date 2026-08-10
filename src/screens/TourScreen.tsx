import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { usePreventScreenCapture } from 'expo-screen-capture';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { colors, typography, spacing } from '../theme/tokens';
import Button from '../components/Button';

type TourRoute = RouteProp<{ Tour: { embedUrl: string; title: string } }, 'Tour'>;

/** Disables the long-press "save image" menu and text selection inside the tour. */
const BLOCK_SAVE_GESTURES = `
  (function () {
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); }, true);
    var css = document.createElement('style');
    css.innerHTML = '*{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;}';
    document.head.appendChild(css);
  })();
  true;
`;

/**
 * The 360 tour, rendered inside the app.
 *
 * A WebView rather than a link out. Handing a tenant to their browser at the
 * exact moment they are most interested costs the return journey, and what they
 * would be looking at is the tour host's website rather than ours.
 *
 * The host is deliberately not named anywhere in here. This screen loads a URL;
 * which company is behind it lives in the listing document, so replacing Kuula
 * with panoramas we host ourselves changes data and nothing else.
 */
export default function TourScreen() {
  const { params } = useRoute<TourRoute>();

  /**
   * Blocks screenshots and screen recording while a tour is open.
   *
   * Raises the cost of lifting the work; does not make it impossible, and
   * nothing can. A second phone pointed at the screen defeats every method
   * there is, and while tours are hosted on a free plan their URLs are public
   * — anyone holding one can open it in a browser, outside this app entirely.
   * The protection worth having is a private-tour plan, not client-side code.
   *
   * Scoped to this screen deliberately. Applied app-wide it would also stop a
   * tenant screenshotting a listing to send to whoever is helping them decide,
   * which is how most Nigerian rental decisions actually get made — that is
   * free distribution, and blocking it would cost more than the copying does.
   */
  usePreventScreenCapture();

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const webviewRef = useRef<WebView>(null);

  /**
   * The host of the tour itself, which is the only place this screen will go.
   *
   * A panorama viewer is a web page, and a web page can carry links — to the
   * host's home page, their sign-up, whatever they choose to put in the corner.
   * Following one would walk the tenant out of the property they were looking
   * at and into somebody else's marketing, inside our own app, with no way back
   * but the system back button.
   *
   * So navigation is pinned to the host we were given. Everything else is
   * refused rather than opened in a browser: silently opening a browser is the
   * exact behaviour this screen exists to avoid.
   */
  const allowedHost = React.useMemo(() => {
    try {
      return new URL(params.embedUrl).host;
    } catch {
      return null;
    }
  }, [params.embedUrl]);

  function retry() {
    setFailed(false);
    setLoading(true);
    // Remounts the WebView. reload() on a view that failed to resolve DNS can
    // sit on the dead request rather than starting a new one.
    setAttempt(n => n + 1);
  }

  if (!allowedHost) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.message}>
          <Text style={styles.messageHeading}>This tour cannot be opened</Text>
          <Text style={styles.messageBody}>
            The link saved against this property is not a valid address. Nothing
            is wrong with your connection — the listing needs fixing.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <WebView
        key={attempt}
        ref={webviewRef}
        source={{ uri: params.embedUrl }}
        style={styles.webview}
        // The viewer is a black sphere; a white flash before it paints reads as
        // a broken page on a dark app.
        containerStyle={styles.webviewContainer}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
        onHttpError={() => {
          setLoading(false);
          setFailed(true);
        }}
        // Panoramas are dragged, pinched and — in VR mode — moved with the
        // device. All of that is the page's job, so it gets the gestures.
        scrollEnabled={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        // No pop-ups. A second window inside a WebView has no address bar and
        // no way back.
        setSupportMultipleWindows={false}
        // Removes the long-press menu that offers "save image" and "copy link",
        // and the text selection that comes with it. Cheap to add, trivial to
        // bypass for anyone who knows what a developer tool is — worth doing
        // because it stops the accidental and the casual, not the determined.
        injectedJavaScript={BLOCK_SAVE_GESTURES}
        allowsLinkPreview={false}
        onShouldStartLoadWithRequest={request => {
          if (request.url === params.embedUrl) return true;
          try {
            return new URL(request.url).host === allowedHost;
          } catch {
            return false;
          }
        }}
      />

      {loading && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.accentGold} />
          <Text style={styles.loadingText}>Loading the tour…</Text>
          {/* Said plainly, because it is true and because a tenant on mobile
              data deserves to know before it is spent. */}
          <Text style={styles.loadingNote}>
            This uses more data than photos do.
          </Text>
        </View>
      )}

      {failed && (
        <View style={styles.overlay}>
          <Text style={styles.messageHeading}>The tour did not load</Text>
          <Text style={styles.messageBody}>
            It is hosted outside the app, so a weak connection stops it even
            when the rest of Directrent works. The photos and the property
            details are all still there.
          </Text>
          <View style={styles.retry}>
            <Button label="Try again" onPress={retry} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  webview: { flex: 1, backgroundColor: colors.background },
  webviewContainer: { backgroundColor: colors.background },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.md,
  },
  loadingNote: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  messageHeading: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.lg,
    textAlign: 'center',
  },
  messageBody: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retry: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
