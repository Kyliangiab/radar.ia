-- Retrait de Hacker News du corpus : source + articles existants.
-- (Un setup neuf n'aura donc jamais HN, malgré le seed de 0003.)
delete from articles where source = 'HN';
delete from sources  where id = 'hn';
