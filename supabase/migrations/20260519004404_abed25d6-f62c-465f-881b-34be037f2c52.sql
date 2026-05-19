-- Trigger: cuando se marca express_paid_at en una pista de un álbum,
-- propagar el pago al resto de pistas del mismo release que tengan
-- el mismo express_tier pero aún sin pagar. Permite pagar el express
-- una sola vez para todo el álbum.
CREATE OR REPLACE FUNCTION public.propagate_album_express_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.release_id IS NOT NULL
     AND NEW.express_paid_at IS NOT NULL
     AND (OLD.express_paid_at IS NULL OR OLD.express_paid_at <> NEW.express_paid_at)
  THEN
    UPDATE public.song_submissions
       SET express_paid_at = NEW.express_paid_at
     WHERE release_id = NEW.release_id
       AND id <> NEW.id
       AND express_tier IS NOT NULL
       AND express_paid_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_propagate_album_express_payment ON public.song_submissions;
CREATE TRIGGER trg_propagate_album_express_payment
AFTER UPDATE OF express_paid_at ON public.song_submissions
FOR EACH ROW
EXECUTE FUNCTION public.propagate_album_express_payment();