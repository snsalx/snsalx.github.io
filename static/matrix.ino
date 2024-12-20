#include <FastLED.h>

#define LEDS_COUNT 256
#define PIN 13

#define PACKET_LENGTH 9
// XY RRG GG BB C where C is the Command
// example command: 00 00 FF 00 0

CRGB leds[LEDS_COUNT];

byte buffer[PACKET_LENGTH];
int input = 0;

byte getPointId(byte x, byte y) {
  y = 16 - y;

  byte idx = 16 * (y - 1);

  idx += (y % 2 != 0) ? x : (15 - x);

  return idx;
}

void point(byte x, byte y, CRGB color) {
  leds[getPointId(x, y)] = color;
}

void setup() {
  // init the matrix
  FastLED.addLeds<WS2812, PIN, GRB>(leds, LEDS_COUNT);
  FastLED.setBrightness(255);

  // init serial
  Serial.begin(65535);
  Serial.println("BOOTUP DONE");
}

byte dec(char hex) {
  if (hex >= 'A' && hex <= 'F') {
    return hex - 'A' + 10;
  }

  if (hex >= 'a') {
    return hex - 'a' + 10;
  }

  return hex - '0';
}

void loop () {
  byte i = 0;

  while (Serial.available()) {
    i = 0;

    while (i < PACKET_LENGTH) {
      input = Serial.read();
      Serial.flush();

      if (input == 'Q' || input == 'q') return;

      if (('A' <= input && input <= 'F') || ('a' <= input && input <= 'f') || ('0' <= input && input <= '9')) {
        buffer[i] = dec(input);
        i++;
        Serial.print((char) input);
      }
    }

    byte cmd = buffer[8];

    if (cmd == 0) {
      byte x = buffer[0];
      byte y = buffer[1];
      byte r = buffer[2] * 16 + buffer[3];
      byte g = buffer[4] * 16 + buffer[5];
      byte b = buffer[6] * 16 + buffer[7];

      point(x, y, CRGB(r, g, b));
    } else {
      FastLED.show();
    }

    Serial.println("OK");
  }
}
