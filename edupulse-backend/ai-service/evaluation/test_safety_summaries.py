import unittest

from app.main import collapse_ultra_concerns, match_issue_taxonomy


class SafetySummaryTests(unittest.TestCase):
    def test_common_safety_typos_are_routed(self) -> None:
        cases = {
            "teacher abusd me": "FACULTY_HARASSMENT",
            "sir harrased me": "FACULTY_HARASSMENT",
            "senior bullid me": "RAGGING",
            "student saw a snak in ground": "ANIMAL_DANGER",
            "there was gun firng near gate": "WEAPON_VIOLENCE",
        }
        for comment, expected_bucket in cases.items():
            with self.subTest(comment=comment):
                rule = match_issue_taxonomy(comment, "Faculty")
                self.assertIsNotNone(rule)
                self.assertEqual(rule["bucket"], expected_bucket)

    def test_normal_typo_does_not_become_weapon_alert(self) -> None:
        rule = match_issue_taxonomy("the classroom fan needs fixing", "Infrastructure")
        self.assertIsNotNone(rule)
        self.assertNotEqual(rule["bucket"], "WEAPON_VIOLENCE")

    def test_vague_abuse_report_stays_cautious(self) -> None:
        concern = collapse_ultra_concerns(
            [
                {
                    "id": "0",
                    "title": "Harassment concern",
                    "reason": "Possible abuse report",
                    "mentions": 1,
                    "evidenceSamples": ["teacher abusd me"],
                    "evidenceDepartments": {"CSE": 1},
                    "extractedEntities": {},
                }
            ]
        )[0]
        summary = concern["detailedSummary"].lower()
        self.assertEqual(concern["title"], "Faculty or staff abuse concern")
        self.assertIn("does not assume harassment", summary)
        self.assertIn("what happened in detail", summary)
        self.assertNotIn("psychological harm", summary)
        self.assertNotIn("physical misconduct has occurred", summary)

    def test_detailed_report_uses_supplied_context(self) -> None:
        concern = collapse_ultra_concerns(
            [
                {
                    "id": "0",
                    "title": "Harassment concern",
                    "reason": "Detailed harassment report",
                    "mentions": 1,
                    "evidenceSamples": [
                        "harshit bullied and harrased me in class on tydesady after calling me into the staffroom"
                    ],
                    "evidenceDepartments": {"CSE": 1},
                    "extractedEntities": {
                        "people": ["Harshit"],
                        "locations": ["Class", "Staffroom"],
                    },
                }
            ]
        )[0]
        summary = concern["detailedSummary"].lower()
        self.assertIn("harshit bullied", summary)
        self.assertIn("remains an allegation", summary)
        self.assertNotIn("does not clearly provide the person involved", summary)
        self.assertNotIn("does not clearly provide the date or time", summary)


if __name__ == "__main__":
    unittest.main()
