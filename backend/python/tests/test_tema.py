import unittest

import tema


class ParagraphTextTests(unittest.TestCase):
    def test_dynamic_text_is_rendered_literally(self):
        texto = 'Ana & Luis <b>Robles</b> > 1'

        parrafo = tema.P(texto, tema.ESTILOS['valor'])

        self.assertEqual(parrafo.getPlainText(), texto)


if __name__ == '__main__':
    unittest.main()
